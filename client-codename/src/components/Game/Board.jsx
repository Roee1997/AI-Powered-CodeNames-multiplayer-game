import { useEffect, useState, useRef } from "react";
import { onValue, ref } from "firebase/database";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../../../firebaseConfig";
import API_BASE from "../../config/api";
import {
  logGuessToServer,
  sendGuessMessage,
  setWinner,
  subscribeToBoard,
  subscribeToLastClue,
  updateCardInFirebase,
  sendActivityHeartbeat
} from "../../services/firebaseService";
import { logMove } from "../../services/moveService";
import { endTurnFromClient } from "../../services/turnService";
import { analyzeGuess, showGuessAnalysis, isGuessAnalysisAvailable } from "../../services/guessAnalysisService";
import Card from "./Card";
import { useSound } from "../../hooks/useSound";

const Board = ({ gameId, user, team, isSpymaster, currentTurn, winner, turnId }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guessCount, setGuessCount] = useState(0);
  const [lastClue, setLastClue] = useState(null);
  const [gameType, setGameType] = useState("classic");
  const sound = useSound();
  const previousClueRef = useRef(null); // לשמירת הרמז הקודם

  const fetchBoard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/board/${user.uid}`);
      const data = await res.json();
      setCards(data);

      // 🎯 SPYMASTER BOARD PAYLOAD LOGGING
      if (isSpymaster && data && data.length > 0) {
        console.log(`\n🎯 ========== SPYMASTER BOARD PAYLOAD ==========`);
        console.log(`🎮 Game ID: ${gameId} | User: ${user.displayName} (${team} Team Spymaster)`);
        
        const redCards = data.filter(c => c.team === 'Red');
        const blueCards = data.filter(c => c.team === 'Blue');
        const neutralCards = data.filter(c => c.team === 'Neutral');
        const assassinCard = data.find(c => c.team === 'Assassin');
        const revealedCards = data.filter(c => c.isRevealed);
        
        console.log(`🔴 RED CARDS (${redCards.length}): ${redCards.map(c => `${c.word}${c.isRevealed ? ' ✅' : ''}`).join(', ')}`);
        console.log(`🔵 BLUE CARDS (${blueCards.length}): ${blueCards.map(c => `${c.word}${c.isRevealed ? ' ✅' : ''}`).join(', ')}`);
        console.log(`⚪ NEUTRAL CARDS (${neutralCards.length}): ${neutralCards.map(c => `${c.word}${c.isRevealed ? ' ✅' : ''}`).join(', ')}`);
        console.log(`⚠️  ASSASSIN CARD: ${assassinCard?.word}${assassinCard?.isRevealed ? ' ✅' : ''}`);
        console.log(`👁️  REVEALED (${revealedCards.length}): ${revealedCards.map(c => c.word).join(', ')}`);
        console.log(`📊 GAME PROGRESS: Red ${redCards.filter(c => c.isRevealed).length}/${redCards.length}, Blue ${blueCards.filter(c => c.isRevealed).length}/${blueCards.length}`);
        console.log(`===============================================\n`);
      }
    } catch (error) {
      console.error("❌ שגיאה בטעינת הלוח:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameId && user?.uid) fetchBoard();
  }, [gameId, user?.uid]);

  useEffect(() => {
    if (!gameId || !turnId) return;
    const unsubBoard = subscribeToBoard(gameId, fetchBoard);
    const unsubClue = subscribeToLastClue(gameId, turnId, (clue) => {
      const previousClue = previousClueRef.current;
      setLastClue(clue);
      setGuessCount(0);
      console.log("📥 רמז חדש התקבל:", clue);
      
      // הפעל צליל רק אם זה רמז חדש אמיתי (לא הטעינה הראשונה)
      if (clue && previousClue && clue.word !== previousClue.word) {
        sound.newClue();
      } else if (clue && !previousClue) {
        // רמז ראשון - גם נשמיע צליל
        sound.newClue();
      }
      
      // שמור את הרמז הנוכחי לבדיקה הבאה
      previousClueRef.current = clue;
    });

    // הרשמה לעדכוני סוג המשחק
    const gameTypeRef = ref(db, `games/${gameId}/settings/gameType`);
    const unsubGameType = onValue(gameTypeRef, (snap) => {
      if (snap.exists()) {
        setGameType(snap.val());
        console.log("🎮 Game type updated:", snap.val());
      }
    });

    return () => {
      unsubBoard();
      unsubClue();
      unsubGameType();
    };
  }, [gameId, turnId]);

  const handleCardClick = async (card, overrideUser = null) => {
    if (!card || card.isRevealed || winner) return;

    const actingUser = overrideUser || user;

    // Send activity heartbeat for human players
    if (!overrideUser && user?.uid) {
      sendActivityHeartbeat(user.uid, gameId, 'card_click');
    }

    if (!overrideUser) {
      if (team !== currentTurn || isSpymaster) return;
      if (!lastClue || lastClue.team !== currentTurn) return;

      const maxGuesses = lastClue?.number ?? 0;
      if (guessCount >= maxGuesses) {
        toast.info("🔒 נגמרו הניחושים לתור הזה!");
        return;
      }
    }

    const isAIGuess = !!overrideUser;

    const res = await fetch(`${API_BASE}/api/games/${gameId}/reveal/${card.cardID}`, { method: "PUT" });
    if (!res.ok) return;

    await updateCardInFirebase(gameId, { ...card, isRevealed: true });
    await fetchBoard();

    const cardTeam = card.team?.trim();
    const correct = cardTeam === currentTurn;
    const isAssassin = cardTeam === "Assassin";
    const isOpponent = cardTeam !== currentTurn && cardTeam !== "Neutral" && cardTeam !== "Assassin";
    const isNeutral = cardTeam === "Neutral";

    let guessType;
    if (isAssassin) guessType = "assassin";
    else if (isNeutral) guessType = "neutral";
    else if (isOpponent) guessType = "opponent";
    else if (correct) guessType = "correct";

    await logMove({
      gameId,
      turnId,
      userId: actingUser.uid,
      wordId: card.wordId || card.wordID || card.cardID,
      result: guessType
    });

    if (guessType) {
      await logGuessToServer(gameId, actingUser.uid, guessType);

      const emojiMap = {
        correct: "🟢",
        opponent: "🔴",
        neutral: "🟡",
        assassin: "☠️"
      };

      const textMap = {
        correct: "צדק!",
        opponent: "טעות",
        neutral: "נייטרלי",
        assassin: "מתנקש!"
      };

      await sendGuessMessage(gameId, {
        type: "guess",
        username: actingUser.displayName,
        word: card.word,
        result: guessType,
        emoji: emojiMap[guessType],
        text: textMap[guessType],
        timestamp: Date.now()
      });

      // Play sound effect based on guess result
      // For AI guesses, use shorter debounce intervals to ensure sounds play
      const soundOptions = isAIGuess ? { minInterval: 50, aiGuess: true } : {};
      
      switch (guessType) {
        case "correct":
          if (isAIGuess) {
            sound.playForTeam('guess-correct', cardTeam, soundOptions);
          } else {
            sound.correctGuess(cardTeam);
          }
          break;
        case "opponent":
          if (isAIGuess) {
            sound.play('guess-wrong', soundOptions);
          } else {
            sound.wrongGuess(cardTeam);
          }
          break;
        case "neutral":
          if (isAIGuess) {
            sound.play('guess-wrong', soundOptions);
          } else {
            sound.neutralGuess();
          }
          break;
        case "assassin":
          if (isAIGuess) {
            sound.play('guess-assassin', { ...soundOptions, volume: 1.2 });
          } else {
            sound.assassinHit();
          }
          break;
      }

      // ניתוח ניחוש במצב המדעי (רק לשחקנים אמיתיים, לא AI)
      if (!overrideUser && isGuessAnalysisAvailable(gameType) && lastClue?.word) {
        console.log("🔬 Analyzing guess in scientific mode...");
        
        // הצג הודעת טעינה מהירה
        const loadingToast = toast("🧠 מנתח דמיון סמנטי...", {
          position: "top-center",
          autoClose: 1500,
          hideProgressBar: true,
          style: { backgroundColor: "#6366f1", color: "white", fontSize: "14px" }
        });

        try {
          const analysis = await analyzeGuess({
            gameId,
            guessedWord: card.word,
            clueWord: lastClue.word,
            allWords: cards.map(c => c.word),
            guessResult: guessType,
            team: currentTurn
          });

          // סגור הודעת טעינה
          toast.dismiss(loadingToast);

          if (analysis) {
            // הצג מיד את התוצאה
            setTimeout(() => {
              showGuessAnalysis(analysis, guessType);
            }, 300);
          }
        } catch (error) {
          console.error("❌ Error in guess analysis:", error);
          toast.dismiss(loadingToast);
          toast.warn("⚠️ לא ניתן לנתח ניחוש כרגע", { autoClose: 2000 });
        }
      }
    }

    const newGuessCount = guessCount + 1;
    setGuessCount(newGuessCount);

    if (isAssassin) {
      await setWinner(gameId, currentTurn === "Red" ? "Blue" : "Red");
      return;
    }

    const red = cards.filter(c => c.isRevealed && c.team === "Red").length + (cardTeam === "Red" ? 1 : 0);
    const blue = cards.filter(c => c.isRevealed && c.team === "Blue").length + (cardTeam === "Blue" ? 1 : 0);
    
    // חישוב מספר הקלפים הכולל של כל קבוצה כדי לקבוע מי התחיל
    const totalRedCards = cards.filter(c => c.team === "Red").length;
    const totalBlueCards = cards.filter(c => c.team === "Blue").length;
    
    // הקבוצה עם יותר קלפים היא זו שהתחילה (9 קלפים) והשנייה צריכה 8
    const redTarget = totalRedCards; // אם יש לה 9 קלפים צריכה 9, אם יש לה 8 צריכה 8
    const blueTarget = totalBlueCards; // אם יש לה 9 קלפים צריכה 9, אם יש לה 8 צריכה 8
    
    if (red === redTarget) return await setWinner(gameId, "Red");
    if (blue === blueTarget) return await setWinner(gameId, "Blue");

    if (!overrideUser && (isOpponent || isNeutral || newGuessCount >= (lastClue?.number ?? 0))) {
      await endTurnFromClient(gameId, currentTurn);
    }
  };

  useEffect(() => {
    const boardElement = document.getElementById("board-card-click-sim");
    if (!boardElement) return;

    const handleAIGuess = async (e) => {
      const guessedCard = e.detail;
      if (guessedCard) {
        await handleCardClick(guessedCard, guessedCard.user);
      }
    };

    boardElement.addEventListener("ai-guess", handleAIGuess);
    return () => boardElement.removeEventListener("ai-guess", handleAIGuess);
  }, [cards, currentTurn, winner, team, isSpymaster, lastClue]);

  if (loading) return <p className="text-center">⏳ טוען לוח...</p>;
  if (cards.length === 0) return <p className="text-center text-red-500">😢 אין קלפים להצגה</p>;

  return (
    <div
      id="board-card-click-sim"
      className="grid grid-cols-3 sm:grid-cols-4 max-ml:grid-cols-5 md:grid-cols-5
             gap-3 max-ml:gap-2.5 sm:gap-4 content-start
             w-full max-w-[1000px] max-ml:max-w-[1200px] mx-auto p-4 max-ml:p-3 overflow-x-auto min-w-fit"
    >
      {cards && cards.length > 0 && cards.map((card) => (
        <div key={card.cardID} className="w-full h-[90px] max-ml:h-[85px] sm:h-[100px]">
          <Card
            card={card}
            gameId={gameId}
            canClick={!card.isRevealed && !winner}
            onCardRevealed={handleCardClick}
            currentTurn={currentTurn}
            userTeam={team}
            isSpymaster={isSpymaster}
          />
        </div>
      ))}
    </div>
  );
};

export default Board;

/**
 * Board Component - רכיב הלוח המרכזי במשחק Codenames
 * 
 * אחראי על:
 * - תצוגת כל הקלפים במערך 5x5 (או 4x5/3x5 במכשירים קטנים)
 * - ניהול לוגיקת לחיצות על קלפים והחשפת מילים
 * - סנכרון בזמן אמת עם Firebase לעדכוני מצב הלוח
 * - ניהול צלילים ואפקטים ויזואליים
 * - תמיכה בניחושי AI וניחושי שחקנים אמיתיים
 * - ניתוח דמיון סמנטי במצב המדעי
 * - מעקב אחר מצב המשחק וקביעת מנצח
 * 
 * התכונות המתקדמות:
 * - מערכת ניתוח ניחושים עם AI embedding analysis
 * - תמיכה בשני מצבי משחק: קלאסי ומדעי
 * - אופטימיזציה למכשירים מגוונים עם grid responsive
 * - מערכת צלילים מתקדמת עם אפקטים שונים לכל סוג ניחוש
 * - מנגנון heartbeat לזיהוי פעילות שחקנים
 */

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

/**
 * רכיב הלוח הראשי - מציג את כל קלפי המשחק ומנהל את האינטראקציות
 * @param {string} gameId - מזהה המשחק
 * @param {Object} user - פרטי המשתמש הנוכחי  
 * @param {string} team - שם הצוות (Red/Blue)
 * @param {boolean} isSpymaster - האם המשתמש הוא מרגל
 * @param {string} currentTurn - הצוות שתורו לשחק כרגע
 * @param {string} winner - שם הצוות המנצח (אם יש)
 * @param {number} turnId - מזהה התור הנוכחי
 */
const Board = ({ gameId, user, team, isSpymaster, currentTurn, winner, turnId }) => {
  // State management - ניהול מצבי הרכיב
  const [cards, setCards] = useState([]);           // מערך כל הקלפים
  const [loading, setLoading] = useState(true);     // מצב טעינה
  const [guessCount, setGuessCount] = useState(0);  // מספר הניחושים בתור הנוכחי
  const [lastClue, setLastClue] = useState(null);   // הרמז האחרון שניתן
  const [gameType, setGameType] = useState("classic"); // סוג המשחק (classic/scientific)
  
  // Hooks וחיבורים חיצוניים
  const sound = useSound();                         // מערכת צלילים
  const previousClueRef = useRef(null);             // שמירת הרמז הקודם לזיהוי רמזים חדשים

  /**
   * טוען את נתוני הלוח מהשרת ומציג מידע מפורט למרגלים
   * כולל רישום מפורט של מצב המשחק לדיבוג ומעקב
   */
  const fetchBoard = async () => {
    try {
      // קריאה לשרת לטעינת נתוני הלוח עם פרטי המשתמש
      const res = await fetch(`${API_BASE}/api/games/${gameId}/board/${user.uid}`);
      const data = await res.json();
      setCards(data);

      // מערכת רישום מפורטת למרגלים - מציגה את כל המידע הדרוש לניתוח המשחק
      if (isSpymaster && data && data.length > 0) {
        console.log(`\n🎯 ========== SPYMASTER BOARD PAYLOAD ==========`);
        console.log(`🎮 Game ID: ${gameId} | User: ${user.displayName} (${team} Team Spymaster)`);
        
        // סינון וארגון הקלפים לפי צוותים לתצוגה ברורה
        const redCards = data.filter(c => c.team === 'Red');
        const blueCards = data.filter(c => c.team === 'Blue');
        const neutralCards = data.filter(c => c.team === 'Neutral');
        const assassinCard = data.find(c => c.team === 'Assassin');
        const revealedCards = data.filter(c => c.isRevealed);
        
        // תצוגה ויזואלית מפורטת של כל המידע
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

  /**
   * Effect לטעינה ראשונית של הלוח כאשר המשחק והמשתמש מוכנים
   */
  useEffect(() => {
    if (gameId && user?.uid) fetchBoard();
  }, [gameId, user?.uid]);

  /**
   * Effect מרכזי לניהול מנויים (subscriptions) בזמן אמת
   * כולל מעקב אחר עדכוני הלוח, רמזים חדשים וסוג המשחק
   */
  useEffect(() => {
    if (!gameId || !turnId) return;
    
    // מנוי לעדכני הלוח - מתעדכן כל פעם שקלף נחשף
    const unsubBoard = subscribeToBoard(gameId, fetchBoard);
    
    // מנוי לרמזים חדשים עם זיהוי חכם של רמזים חדשים אמיתיים
    const unsubClue = subscribeToLastClue(gameId, turnId, (clue) => {
      const previousClue = previousClueRef.current;
      setLastClue(clue);
      setGuessCount(0); // איפוס מונה הניחושים עבור רמז חדש
      console.log("📥 רמז חדש התקבל:", clue);
      
      // הפעלת צליל רק אם זה רמז חדש אמיתי (לא טעינה ראשונה)
      if (clue && previousClue && clue.word !== previousClue.word) {
        sound.newClue();
      } else if (clue && !previousClue) {
        // רמז ראשון במשחק - גם נשמיע צליל
        sound.newClue();
      }
      
      // שמירת הרמז הנוכחי לבדיקה בפעם הבאה
      previousClueRef.current = clue;
    });

    // מנוי לעדכוני סוג המשחק (קלאסי/מדעי) לתכונות מתקדמות
    const gameTypeRef = ref(db, `games/${gameId}/settings/gameType`);
    const unsubGameType = onValue(gameTypeRef, (snap) => {
      if (snap.exists()) {
        setGameType(snap.val());
        console.log("🎮 Game type updated:", snap.val());
      }
    });

    // ניקוי מנויים בעת הרס הרכיב
    return () => {
      unsubBoard();
      unsubClue();
      unsubGameType();
    };
  }, [gameId, turnId]);

  /**
   * פונקציה מרכזית לטיפול בלחיצה על קלף - מנהלת את כל לוגיקת המשחק
   * תומכת הן בניחושי שחקנים אמיתיים והן בניחושי AI
   * 
   * תהליך הפעולה:
   * 1. אימות תקינות הלחיצה (קלף קיים, לא נחשף, אין מנצח)
   * 2. בדיקת הרשאות (תור נכון, לא מרגל, יש רמז)  
   * 3. חשיפת הקלף בשרת ו-Firebase
   * 4. בדיקת תוצאת הניחוש (נכון/טעות/נייטרלי/מתנקש)
   * 5. רישום המהלך ושליחת הודעת צ'אט
   * 6. הפעלת צלילים מתאימים
   * 7. ניתוח ניחוש במצב מדעי (אם זמין)
   * 8. בדיקת תנאי ניצחון
   * 9. החלטה על המשך התור או סיומו
   * 
   * @param {Object} card - נתוני הקלף שנלחץ
   * @param {Object} overrideUser - משתמש חלופי (לניחושי AI)
   */
  const handleCardClick = async (card, overrideUser = null) => {
    // שלב 1: בדיקות תקינות בסיסיות
    if (!card || card.isRevealed || winner) return;

    // קביעת המשתמש הפועל (משתמש רגיל או AI)
    const actingUser = overrideUser || user;

    // שלב 2: שליחת heartbeat עבור שחקנים אמיתיים לזיהוי פעילות
    if (!overrideUser && user?.uid) {
      sendActivityHeartbeat(user.uid, gameId, 'card_click');
    }

    // שלב 3: בדיקת הרשאות עבור שחקנים אמיתיים (AI מקבל חריגה)
    if (!overrideUser) {
      // בדיקה שזה התור של הצוות ושהמשתמש לא מרגל
      if (team !== currentTurn || isSpymaster) return;
      
      // בדיקה שיש רמז תקף מהצוות הנכון
      if (!lastClue || lastClue.team !== currentTurn) return;

      // בדיקה שלא נגמרו הניחושים המותרים
      const maxGuesses = lastClue?.number ?? 0;
      if (guessCount >= maxGuesses) {
        toast.info("🔒 נגמרו הניחושים לתור הזה!");
        return;
      }
    }

    // זיהוי האם זה ניחוש AI או שחקן אמיתי
    const isAIGuess = !!overrideUser;

    // שלב 4: חשיפת הקלף בשרת - עדכון מצב הקלף למצב נחשף
    const res = await fetch(`${API_BASE}/api/games/${gameId}/reveal/${card.cardID}`, { method: "PUT" });
    if (!res.ok) return;

    // שלב 5: עדכון מיידי ב-Firebase וטעינה מחודשת של הלוח
    await updateCardInFirebase(gameId, { ...card, isRevealed: true });
    await fetchBoard();

    // שלב 6: ניתוח תוצאת הניחוש - קביעת סוג הקלף שנחשף
    const cardTeam = card.team?.trim();
    const correct = cardTeam === currentTurn;           // ניחוש נכון - קלף של הצוות
    const isAssassin = cardTeam === "Assassin";         // מתנקש - סיום מיידי של המשחק
    const isOpponent = cardTeam !== currentTurn && cardTeam !== "Neutral" && cardTeam !== "Assassin"; // קלף יריב
    const isNeutral = cardTeam === "Neutral";           // קלף נייטרלי

    // קביעת סוג הניחוש לצורכי רישום וצלילים
    let guessType;
    if (isAssassin) guessType = "assassin";
    else if (isNeutral) guessType = "neutral";
    else if (isOpponent) guessType = "opponent";
    else if (correct) guessType = "correct";

    // שלב 7: רישום המהלך במסד הנתונים לצורכי ניתוח וסטטיסטיקות
    await logMove({
      gameId,
      turnId,
      userId: actingUser.uid,
      wordId: card.wordId || card.wordID || card.cardID,
      result: guessType
    });

    // שלב 8: עיבוד תוצאת הניחוש - רישום ושליחת הודעות
    if (guessType) {
      await logGuessToServer(gameId, actingUser.uid, guessType);

      // מיפוי אמוג'ים לכל סוג ניחוש
      const emojiMap = {
        correct: "🟢",
        opponent: "🔴", 
        neutral: "🟡",
        assassin: "☠️"
      };

      // מיפוי טקסטים בעברית לכל סוג ניחוש
      const textMap = {
        correct: "צדק!",
        opponent: "טעות",
        neutral: "נייטרלי", 
        assassin: "מתנקש!"
      };

      // שליחת הודעה לצ'אט המשחק עם פרטי הניחוש
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

import { get, ref, runTransaction, set } from "firebase/database";
import { db } from "../../firebaseConfig";
import API_BASE from "../config/api";
import { clearLastClue, endTurnFromClient } from "../services/turnService";

// Per-team AI guessing flags to prevent conflicts between teams
const isAIGuessing = {
  Red: false,
  Blue: false
};

const fetchTurnId = async (gameId) => {
  const turnRef = ref(db, `games/${gameId}/currentTurnId`);
  const snapshot = await get(turnRef);
  return snapshot.val();
};

const normalize = (text) =>
  text?.trim().toLowerCase().replace(/[^֐-׿a-zA-Z0-9]/gu, "") || "";

const generateClueFromServer = async (
  teamCards,
  allBoardWords,
  revealedWords,
  opponentWords,
  assassinWord,
  gameId,
  team,
  previousClueWords,
  turnId,
  turnStartTimestamp,
  aiSpymasterUserId,
  customPrompt = ""
) => {
  try {
    // רישום המידע שנשלח לשרת
    console.log(`[aiService] 📤 Preparing request for team: ${team}`);
    
    // 🎯 SPYMASTER CARD BREAKDOWN - Visual Table Format
    console.log(`\n🎯 ========== SPYMASTER PAYLOAD BREAKDOWN ==========`);
    console.log(`📋 ${team.toUpperCase()} TEAM CARDS (${teamCards?.length ?? 0}):`, teamCards?.map(c => c.word) ?? []);
    console.log(`🎯 OPPONENT WORDS (${opponentWords?.length ?? 0}):`, opponentWords ?? []);
    console.log(`⚪ REVEALED WORDS (${revealedWords?.length ?? 0}):`, revealedWords ?? []);
    console.log(`⚠️  ASSASSIN WORD: ${assassinWord ?? "N/A"}`);
    console.log(`🌐 ALL BOARD WORDS (${allBoardWords?.length ?? 0}):`, allBoardWords ?? []);
    console.log(`🔄 PREVIOUS CLUES (${previousClueWords?.length ?? 0}):`, previousClueWords ?? []);
    console.log(`🎨 CUSTOM PROMPT: ${customPrompt || "None"}`);
    console.log(`================================================\n`);

    const requestPayload = {
      TeamWords: teamCards.map((c) => c.word),
      AllBoardWords: allBoardWords,
      RevealedWords: revealedWords,
      OpponentWords: opponentWords,
      AssassinWord: assassinWord,
      GameID: gameId,
      Team: team,
      TurnID: turnId,
      AISpymasterUserID: aiSpymasterUserId,
      TurnStartTimestamp: turnStartTimestamp,
      PreviousClueWords: previousClueWords,
      CustomPrompt: customPrompt
    };

    console.log(`[aiService] 🚀 Full Request Payload:`, JSON.stringify(requestPayload, null, 2));

    const response = await fetch(`${API_BASE}/api/ai/generate-clue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });
    if (!response.ok) throw new Error("שגיאה מהשרת");
    const data = await response.json();
    return { clue: data.clue, count: data.count };
  } catch (err) {
    console.error("❌ שגיאה בקריאה ל־GPT:", err);
    return null;
  }
};

export const runAIClueGenerator = async (gameId, team) => {
  const lockRef = ref(db, `games/${gameId}/aiLock/${team}`);
  const result = await runTransaction(lockRef, (current) =>
    current === "locked" ? undefined : "locked"
  );
  if (!result.committed) {
    console.log("🔒 AI כבר רץ – מדלג");
    return;
  }

  try {
    console.log(`[runAIClueGenerator] 🎯 Starting AI clue generation for ${team} team`);

    // Check if game has already ended before starting AI clue generation
    const winnerSnap = await get(ref(db, `games/${gameId}/winner`));
    const winner = winnerSnap.val();
    if (winner) {
      console.log(`[runAIClueGenerator] 🛑 Game ${gameId} already has winner: ${winner} - stopping AI clue generation`);
      console.log(`🛑 המשחק כבר הסתיים עם מנצח ${winner} - עוצר ייצור רמזי AI`);
      return;
    }

    // טוען פרומפט מותאם מפיירבייס
    const promptsSnap = await get(ref(db, `games/${gameId}/aiPrompts`));
    const customPrompts = promptsSnap.val() || {};
    const customPrompt = customPrompts[team.toLowerCase()] || "";
    console.log(`[runAIClueGenerator] 🎨 Loaded custom prompt for ${team}:`, customPrompt || "None");

    const cardsSnapshot = await get(ref(db, `games/${gameId}/cards`));
    const allCards = Object.values(cardsSnapshot.val() || {});
    console.log(`[runAIClueGenerator] 🃏 Total cards loaded from Firebase: ${allCards.length}`);

    const teamCards = allCards.filter(
      (c) => c.team?.toLowerCase() === team.toLowerCase() && !c.isRevealed
    );
    const opponentWords = allCards
      .filter(
        (c) =>
          c.team?.toLowerCase() !== team.toLowerCase() &&
          c.team?.toLowerCase() !== "neutral" &&
          c.team?.toLowerCase() !== "assassin" &&
          !c.isRevealed
      )
      .map((c) => c.word);
    const revealedWords = allCards.filter((c) => c.isRevealed).map((c) => c.word);
    const allWords = [...new Set(allCards.map((c) => c.word))];
    const assassinWord =
      allCards.find((c) => c.team?.toLowerCase() === "assassin")?.word || "";


    const cluesSnap = await get(ref(db, `games/${gameId}/clues`));
    const pastClues = Object.values(cluesSnap.val() || {});
    const previousClueWords = pastClues.map((c) => normalize(c.word));
    const normalizedBoardWords = allWords.map(normalize);
    const turnId = await fetchTurnId(gameId);
    const turnStartTimestamp = Date.now();
    const aiSpymasterUserId = `ai-${team.toLowerCase()}-spymaster`;

    let clueObj = null;
    let lastFailReason = "";
    
    for (let i = 0; i < 10; i++) {
      
      const resultClue = await generateClueFromServer(
        teamCards,
        allWords,
        revealedWords,
        opponentWords,
        assassinWord,
        gameId,
        team,
        previousClueWords,
        turnId,
        turnStartTimestamp,
        aiSpymasterUserId,
        customPrompt
      );

      if (!resultClue) {
        lastFailReason = "לא התקבלה תשובה מהשרת";
        continue;
      }

      const clueWord = normalize(resultClue.clue);
      if (previousClueWords.includes(clueWord)) {
        lastFailReason = `רמז כבר שימש: ${resultClue.clue}`;
        continue;
      }
      if (normalizedBoardWords.includes(clueWord)) {
        lastFailReason = `רמז מופיע בלוח: ${resultClue.clue}`;
        continue;
      }

      clueObj = {
        word: resultClue.clue,
        number: resultClue.count,
        from: aiSpymasterUserId,
        team,
        giverName: "AI",
        timestamp: Date.now()
      };
      console.log(`✅ AI ניסיון #${i + 1} הצליח: ${clueObj.word} (${clueObj.number})`);
      break;
    }

    // Combined: Preserve fallback system from michael-test with enhanced logging
    if (!clueObj) {
      console.log(`[runAIClueGenerator] ❌ All 10 attempts failed - no valid clue generated`);
      console.warn(`🚨 כל 10 ניסיונות של AI נכשלו. סיבה אחרונה: ${lastFailReason}`);
      console.log("[runAIClueGenerator] 🔄 Creating fallback clue to prevent game stalling...");
      console.log("🔄 יוצר רמז גיבוי כדי למנוע תקיעת המשחק...");
      
      // רמזי גיבוי בטוחים שלעולם לא מופיעים בלוח
      const fallbackClues = [
        { word: "דבר", number: 1 },    // "thing" 
        { word: "רעיון", number: 1 },  // "idea"
        { word: "מושג", number: 1 },   // "concept"
        { word: "נושא", number: 1 },   // "topic"
        { word: "עניין", number: 1 }   // "matter"
      ];
      
      // בחירת רמז גיבוי שלא שימש כבר
      let fallbackClue = null;
      for (const backup of fallbackClues) {
        if (!previousClueWords.includes(normalize(backup.word))) {
          fallbackClue = backup;
          break;
        }
      }
      
      // אם גם הגיבויים שימשו, נשתמש ברמז עם מספר רנדומי
      if (!fallbackClue) {
        fallbackClue = { 
          word: `דבר${Math.floor(Math.random() * 1000)}`, 
          number: 1 
        };
      }
      
      clueObj = {
        word: fallbackClue.word,
        number: fallbackClue.number,
        from: aiSpymasterUserId,
        team,
        giverName: "AI",
        timestamp: Date.now()
      };
      
      console.log(`[runAIClueGenerator] 🆘 Generated fallback clue: ${clueObj.word} (${clueObj.number})`);
      console.log(`🆘 נוצר רמז גיבוי: ${clueObj.word} (${clueObj.number})`);
    }

    // Add 200ms delay before writing clue to Firebase for proper timing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await set(ref(db, `games/${gameId}/lastClue`), clueObj);
    
    // Add 200ms delay between Firebase writes for proper chronological order
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await set(ref(db, `games/${gameId}/lastClues/${turnId}`), clueObj);
    
    // Add 200ms delay between Firebase writes for proper chronological order  
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await set(ref(db, `games/${gameId}/clues/${clueObj.timestamp}`), clueObj);
    console.log(`✅ AI שלח רמז חדש: ${clueObj.word} (${clueObj.number})`);

    const durationInSeconds = Math.floor((Date.now() - turnStartTimestamp) / 1000);
    try {
      const clueResponse = await fetch(`${API_BASE}/api/clues/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          GameID: gameId,
          TurnID: turnId,
          UserID: aiSpymasterUserId,
          Team: team,
          ClueWord: clueObj.word,
          ClueNumber: clueObj.number,
          DurationInSeconds: durationInSeconds
        })
      });
      if (!clueResponse.ok) throw new Error("❌ שגיאה בשמירת רמז AI ב-SQL");
      console.log("📦 רמז AI נשמר גם ב־SQL");
    } catch (error) {
      console.error("❌ שגיאה בשליחת רמז ל־SQL:", error);
    }
  } catch (err) {
    console.error("❌ שגיאה בשליחת רמז:", err);
  } finally {
    await set(lockRef, "done");
  }
};

export const runAIGuess = async (gameId, team) => {
  if (isAIGuessing[team]) return;
  isAIGuessing[team] = true;

  const lockRef = ref(db, `games/${gameId}/aiGuessLock/${team}`);
  const result = await runTransaction(lockRef, (current) =>
    current === "locked" ? undefined : "locked"
  );
  if (!result.committed) {
    isAIGuessing[team] = false;
    return;
  }

  try {
    // Check if game has already ended before AI starts guessing
    const winnerSnap = await get(ref(db, `games/${gameId}/winner`));
    const winner = winnerSnap.val();
    if (winner) {
      console.log(`[runAIGuess] 🛑 Game ${gameId} already has winner: ${winner} - stopping AI guessing`);
      console.log(`🛑 המשחק כבר הסתיים עם מנצח ${winner} - עוצר ניחושי AI`);
      isAIGuessing[team] = false;
      return;
    }
    const res = await fetch(`${API_BASE}/api/games/${gameId}/board/ai`);
    if (!res.ok) throw new Error("שגיאה בטעינת קלפים מהשרת");
    const allCards = await res.json();

    const clueSnap = await get(ref(db, `games/${gameId}/lastClues/${await fetchTurnId(gameId)}`));
    const lastClue = clueSnap.val();
    if (!lastClue || lastClue.team !== team) return;

    const unrevealedCards = allCards.filter((c) => !c.isRevealed);
    const unrevealedWords = unrevealedCards.map((c) => c.word);

    const response = await fetch(`${API_BASE}/api/ai/guesses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clueWord: lastClue.word,
        clueNumber: lastClue.number,
        boardWords: unrevealedWords,
        team
      })
    });

    if (!response.ok) throw new Error("שגיאה מהשרת ב־/guesses");
    const { guesses = [] } = await response.json();

    const maxGuesses = lastClue?.number ?? 0;
    const limitedGuesses = guesses.slice(0, maxGuesses);

    const playersSnap = await get(ref(db, `lobbies/${gameId}/players`));
    const allPlayers = playersSnap.val() || {};
    const aiPlayer = Object.values(allPlayers).find(
      (p) =>
        p.team?.toLowerCase() === team.toLowerCase() &&
        p.isAI &&
        !p.isSpymaster
    );
    const aiUserID = aiPlayer?.userID;

    // Add 200ms delay before starting AI guessing for proper timing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    for (const word of limitedGuesses) {
      const card = allCards.find((c) => c.word === word && !c.isRevealed);
      if (!card) continue;

      const board = document.getElementById("board-card-click-sim");
      if (!board) break;

      board.dispatchEvent(
        new CustomEvent("ai-guess", {
          detail: {
            ...card,
            cardID: card.cardID,
            user: {
              uid: aiUserID || `ai-${team.toLowerCase()}-guesser`,
              displayName: "AI"
            }
          }
        })
      );

      await new Promise((res) => setTimeout(res, 1200));

      const guessType =
        card.team?.toLowerCase() === team.toLowerCase()
          ? "correct"
          : card.team?.toLowerCase() === "neutral"
          ? "neutral"
          : card.team?.toLowerCase() === "assassin"
          ? "assassin"
          : "opponent";

      // אם זו טעות, הפסק את לולאת הניחושים
      if (guessType !== "correct") {
        break;
      }
    }

    // Add 200ms delay after guessing completes for proper timing
    await new Promise(resolve => setTimeout(resolve, 200));

    // סיים תור במידה ונגמרו הניחושים או שהיתה טעות
    await clearLastClue(gameId);
    
    // Add 200ms delay before ending turn for proper chronological order
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await endTurnFromClient(gameId, team);
  } catch (err) {
    console.error("❌ שגיאה בניחושי AI:", err);
  } finally {
    isAIGuessing[team] = false;
    await set(lockRef, "done");
  }
};

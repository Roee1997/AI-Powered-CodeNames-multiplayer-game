/**
 * AI Service - שירות מרכזי לניהול כל פעולות הבינה המלאכותית במשחק Codenames
 * 
 * אחראי על:
 * - ייצור רמזים חכמים על ידי AI Spymaster
 * - ביצוע ניחושים אסטרטגיים על ידי AI Operative  
 * - סנכרון עם Firebase ו-API הבקאנד
 * - מניעת קונפליקטים בין צוותים באמצעות מנגנון נעילות
 * - טיפול בתקלות ומצבי גיבוי
 * 
 * תכונות מתקדמות:
 * - מערכת נעילות מתקדמת למניעת כפל פעולות
 * - מנגנון retry לרמזים לא תקינים
 * - רמזי גיבוי במקרה של כשל GPT
 * - עיכובי זמן לסנכרון מדויק עם Firebase
 */

import { get, ref, runTransaction, set } from "firebase/database";
import { db } from "../../firebaseConfig";
import API_BASE from "../config/api";
import { clearLastClue, endTurnFromClient } from "../services/turnService";

/**
 * דגלי מצב למניעת קונפליקטים בין צוותי AI
 * מונע מספר פעילות ניחוש במקביל עבור אותו צוות
 */
const isAIGuessing = {
  Red: false,
  Blue: false
};

/**
 * שולף את מזהה התור הנוכחי מ-Firebase
 * @param {string} gameId - מזהה המשחק
 * @returns {Promise<number>} מזהה התור הנוכחי
 */
const fetchTurnId = async (gameId) => {
  const turnRef = ref(db, `games/${gameId}/currentTurnId`);
  const snapshot = await get(turnRef);
  return snapshot.val();
};

/**
 * מנרמל טקסט להשוואה - מסיר רווחים, הופך לאותיות קטנות ומסיר תווים מיוחדים
 * תומך בעברית ואנגלית
 * @param {string} text - הטקסט לנורמליזציה
 * @returns {string} טקסט מנורמל
 */
const normalize = (text) =>
  text?.trim().toLowerCase().replace(/[^֐-׿a-zA-Z0-9]/gu, "") || "";

/**
 * פונקציה מרכזית לייצור רמזים מהשרת באמצעות OpenAI GPT-4o
 * שולחת את כל נתוני המשחק לבקאנד ומקבלת רמז חכם ומספר מילים
 * 
 * @param {Array} teamCards - קלפי הצוות שצריך לעזור לזהות
 * @param {Array} allBoardWords - כל המילים על הלוח  
 * @param {Array} revealedWords - מילים שכבר נחשפו
 * @param {Array} opponentWords - מילים של הצוות המתחרה
 * @param {string} assassinWord - מילת המתנקש המסוכנת
 * @param {string} gameId - מזהה המשחק
 * @param {string} team - שם הצוות (Red/Blue)
 * @param {Array} previousClueWords - רמזים שכבר נתנו בעבר
 * @param {number} turnId - מזהה התור הנוכחי
 * @param {number} turnStartTimestamp - זמן תחילת התור
 * @param {string} aiSpymasterUserId - מזהה המשתמש AI Spymaster
 * @param {string} customPrompt - הנחיות מותאמות אישית
 * @returns {Promise<Object|null>} אובייקט עם רמז ומספר או null במקרה של כשל
 */
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
    // רישום מפורט של הנתונים הנשלחים לשרת - חשוב לדיבוג ומעקב איכות
    console.log(`[aiService] 📤 Preparing request for team: ${team}`);
    
    // תצוגה ויזואלית מפורטת של כל נתוני הקלט
    console.log(`\n🎯 ========== SPYMASTER PAYLOAD BREAKDOWN ==========`);
    console.log(`📋 ${team.toUpperCase()} TEAM CARDS (${teamCards?.length ?? 0}):`, teamCards?.map(c => c.word) ?? []);
    console.log(`🎯 OPPONENT WORDS (${opponentWords?.length ?? 0}):`, opponentWords ?? []);
    console.log(`⚪ REVEALED WORDS (${revealedWords?.length ?? 0}):`, revealedWords ?? []);
    console.log(`⚠️  ASSASSIN WORD: ${assassinWord ?? "N/A"}`);
    console.log(`🌐 ALL BOARD WORDS (${allBoardWords?.length ?? 0}):`, allBoardWords ?? []);
    console.log(`🔄 PREVIOUS CLUES (${previousClueWords?.length ?? 0}):`, previousClueWords ?? []);
    console.log(`🎨 CUSTOM PROMPT: ${customPrompt || "None"}`);
    console.log(`================================================\n`);

    // הכנת אובייקט הבקשה עם כל הנתונים הנדרשים לשרת
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

    // שליחת בקשת HTTP ל-API endpoint לייצור רמזים
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

/**
 * פונקציה מרכזית להפעלת ייצור רמזים על ידי AI Spymaster
 * כולל מנגנון נעילה למניעת הפעלות מרובות, אימות מצב משחק, וטיפול בשגיאות
 * 
 * תהליך הפעולה:
 * 1. נעילת המשאב למניעת הפעלות מקבילות
 * 2. בדיקת מצב המשחק (האם הסתיים)
 * 3. טעינת נתוני המשחק מ-Firebase
 * 4. ייצור רמז עם מנגנון retry (עד 10 ניסיונות)
 * 5. אימות הרמז (שלא חוזר על עצמו, לא מופיע בלוח)
 * 6. שמירת הרמז ב-Firebase ו-SQL
 * 7. שחרור הנעילה
 * 
 * @param {string} gameId - מזהה המשחק
 * @param {string} team - שם הצוות (Red/Blue)
 */
export const runAIClueGenerator = async (gameId, team) => {
  // שלב 1: יצירת נעילה למניעת הפעלות מקבילות של אותו AI
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

    // שלב 2: בדיקה האם המשחק כבר הסתיים - אם כן, אין צורך ברמז
    const winnerSnap = await get(ref(db, `games/${gameId}/winner`));
    const winner = winnerSnap.val();
    if (winner) {
      console.log(`[runAIClueGenerator] 🛑 Game ${gameId} already has winner: ${winner} - stopping AI clue generation`);
      console.log(`🛑 המשחק כבר הסתיים עם מנצח ${winner} - עוצר ייצור רמזי AI`);
      return;
    }

    // שלב 3: טעינת פרומפט מותאם אישית אם קיים
    const promptsSnap = await get(ref(db, `games/${gameId}/aiPrompts`));
    const customPrompts = promptsSnap.val() || {};
    const customPrompt = customPrompts[team.toLowerCase()] || "";
    console.log(`[runAIClueGenerator] 🎨 Loaded custom prompt for ${team}:`, customPrompt || "None");

    // שלב 4: טעינת כל קלפי המשחק מ-Firebase
    const cardsSnapshot = await get(ref(db, `games/${gameId}/cards`));
    const allCards = Object.values(cardsSnapshot.val() || {});
    console.log(`[runAIClueGenerator] 🃏 Total cards loaded from Firebase: ${allCards.length}`);

    // שלב 5: סינון וארגון הקלפים לפי קטגוריות
    // קלפי הצוות - שצריך לעזור לזהות (רק אלה שעדיין לא נחשפו)
    const teamCards = allCards.filter(
      (c) => c.team?.toLowerCase() === team.toLowerCase() && !c.isRevealed
    );
    
    // מילים של הצוות המתחרה (להימנע מהן ברמז)
    const opponentWords = allCards
      .filter(
        (c) =>
          c.team?.toLowerCase() !== team.toLowerCase() &&
          c.team?.toLowerCase() !== "neutral" &&
          c.team?.toLowerCase() !== "assassin" &&
          !c.isRevealed
      )
      .map((c) => c.word);
      
    // מילים שכבר נחשפו (להימנע מהן ברמז)
    const revealedWords = allCards.filter((c) => c.isRevealed).map((c) => c.word);
    
    // כל המילים על הלוח
    const allWords = [...new Set(allCards.map((c) => c.word))];
    
    // מילת המתנקש - הכי חשוב להימנע ממנה!
    const assassinWord =
      allCards.find((c) => c.team?.toLowerCase() === "assassin")?.word || "";

    // שלב 6: טעינת רמזים קודמים למניעת חזרה
    const cluesSnap = await get(ref(db, `games/${gameId}/clues`));
    const pastClues = Object.values(cluesSnap.val() || {});
    const previousClueWords = pastClues.map((c) => normalize(c.word));
    const normalizedBoardWords = allWords.map(normalize);
    const turnId = await fetchTurnId(gameId);
    const turnStartTimestamp = Date.now();
    const aiSpymasterUserId = `ai-${team.toLowerCase()}-spymaster`;

    // שלב 7: לולאת ייצור רמזים עם מנגנון retry חכם
    let clueObj = null;
    let lastFailReason = "";
    
    // מנסה עד 10 פעמים לייצר רמז תקין
    for (let i = 0; i < 10; i++) {
      
      // קריאה לשרת לייצור רמז חדש
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

      // אם לא התקבל רמז מהשרת - נסה שוב
      if (!resultClue) {
        lastFailReason = "לא התקבלה תשובה מהשרת";
        continue;
      }

      // שלב 8: אימות הרמז - בדיקה שלא חוזר על עצמו
      const clueWord = normalize(resultClue.clue);
      if (previousClueWords.includes(clueWord)) {
        lastFailReason = `רמז כבר שימש: ${resultClue.clue}`;
        continue;
      }
      
      // בדיקה שהרמז לא מופיע כמילה על הלוח
      if (normalizedBoardWords.includes(clueWord)) {
        lastFailReason = `רמז מופיע בלוח: ${resultClue.clue}`;
        continue;
      }

      // רמז תקין נמצא! יצירת אובייקט הרמז הסופי
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

    // שלב 9: מערכת גיבוי - אם כל הניסיונות נכשלו
    if (!clueObj) {
      console.log(`[runAIClueGenerator] ❌ All 10 attempts failed - no valid clue generated`);
      console.warn(`🚨 כל 10 ניסיונות של AI נכשלו. סיבה אחרונה: ${lastFailReason}`);
      console.log("[runAIClueGenerator] 🔄 Creating fallback clue to prevent game stalling...");
      console.log("🔄 יוצר רמז גיבוי כדי למנוע תקיעת המשחק...");
      
      // רשימת רמזי גיבוי בטוחים - מילים כלליות שלעולם לא מופיעות בלוח Codenames
      const fallbackClues = [
        { word: "דבר", number: 1 },    // "thing" 
        { word: "רעיון", number: 1 },  // "idea"
        { word: "מושג", number: 1 },   // "concept"
        { word: "נושא", number: 1 },   // "topic"
        { word: "עניין", number: 1 }   // "matter"
      ];
      
      // בחירת רמז גיבוי שלא שימש כבר במשחק
      let fallbackClue = null;
      for (const backup of fallbackClues) {
        if (!previousClueWords.includes(normalize(backup.word))) {
          fallbackClue = backup;
          break;
        }
      }
      
      // במקרה הקיצוני שגם הגיבויים שימשו - יצירת רמז עם מספר רנדומי
      if (!fallbackClue) {
        fallbackClue = { 
          word: `דבר${Math.floor(Math.random() * 1000)}`, 
          number: 1 
        };
      }
      
      // יצירת אובייקט רמז גיבוי
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

    // שלב 10: שמירת הרמז ב-Firebase במספר מיקומים עם עיכובי זמן מדויקים
    
    // עיכוב קטן לפני כתיבה ראשונה - להבטחת סדר כרונולוגי נכון
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // שמירה במיקום הרמז האחרון (לגישה מהירה)
    await set(ref(db, `games/${gameId}/lastClue`), clueObj);
    
    // עיכוב בין כתיבות למניעת race conditions
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // שמירה לפי תור ספציפי (לעיקוב היסטוריה)
    await set(ref(db, `games/${gameId}/lastClues/${turnId}`), clueObj);
    
    // עיכוב נוסף להבטחת סדר כתיבה נכון  
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // שמירה בארכיון הרמזים הכללי (לניתוח ומעקב)
    await set(ref(db, `games/${gameId}/clues/${clueObj.timestamp}`), clueObj);
    console.log(`✅ AI שלח רמז חדש: ${clueObj.word} (${clueObj.number})`);

    // שלב 11: שמירה נוספת למסד נתונים SQL לצורכי ניתוח וסטטיסטיקות
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
    // שלב 12: שחרור הנעילה - חשוב לעשות תמיד, גם במקרה של שגיאה
    await set(lockRef, "done");
  }
};

/**
 * פונקציה מרכזית להפעלת ניחושים על ידי AI Operative
 * כולל מנגנון נעילה כפול למניעת ניחושים מקבילים, וביצוע רצף ניחושים חכם
 * 
 * תהליך הפעולה:
 * 1. בדיקת דגל מצב פנימי למניעת הפעלות מקבילות
 * 2. נעילת Firebase למניעת קונפליקטים בין לקוחות
 * 3. בדיקת מצב המשחק (האם הסתיים)
 * 4. טעינת הרמז האחרון ונתוני הלוח
 * 5. קבלת רשימת ניחושים מהשרת
 * 6. ביצוע הניחושים בזה אחר זה עם עיכובי זמן
 * 7. עצירה במקרה של טעות
 * 8. סיום התור
 * 
 * @param {string} gameId - מזהה המשחק
 * @param {string} team - שם הצוות (Red/Blue)
 */
export const runAIGuess = async (gameId, team) => {
  // שלב 1: בדיקת דגל מצב פנימי - מניעת הפעלות מקבילות באותו תהליך
  if (isAIGuessing[team]) return;
  isAIGuessing[team] = true;

  // שלב 2: נעילת Firebase - מניעת הפעלות מקבילות בין לקוחות שונים
  const lockRef = ref(db, `games/${gameId}/aiGuessLock/${team}`);
  const result = await runTransaction(lockRef, (current) =>
    current === "locked" ? undefined : "locked"
  );
  if (!result.committed) {
    isAIGuessing[team] = false;
    return;
  }

  try {
    // שלב 3: בדיקה האם המשחק כבר הסתיים - אם כן, אין צורך בניחושים
    const winnerSnap = await get(ref(db, `games/${gameId}/winner`));
    const winner = winnerSnap.val();
    if (winner) {
      console.log(`[runAIGuess] 🛑 Game ${gameId} already has winner: ${winner} - stopping AI guessing`);
      console.log(`🛑 המשחק כבר הסתיים עם מנצח ${winner} - עוצר ניחושי AI`);
      isAIGuessing[team] = false;
      return;
    }
    // שלב 4: טעינת נתוני הלוח מהשרת
    const res = await fetch(`${API_BASE}/api/games/${gameId}/board/ai`);
    if (!res.ok) throw new Error("שגיאה בטעינת קלפים מהשרת");
    const allCards = await res.json();

    // שלב 5: טעינת הרמז האחרון ואימות שהוא שייך לצוות הנכון
    const clueSnap = await get(ref(db, `games/${gameId}/lastClues/${await fetchTurnId(gameId)}`));
    const lastClue = clueSnap.val();
    if (!lastClue || lastClue.team !== team) return;

    // שלב 6: הכנת רשימת המילים הזמינות לניחוש (שעדיין לא נחשפו)
    const unrevealedCards = allCards.filter((c) => !c.isRevealed);
    const unrevealedWords = unrevealedCards.map((c) => c.word);

    // שלב 7: קבלת רשימת ניחושים מהשרת באמצעות GPT
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

    // שלב 8: הגבלת מספר הניחושים לפי כללי המשחק
    const maxGuesses = lastClue?.number ?? 0;
    const limitedGuesses = guesses.slice(0, maxGuesses);

    // שלב 9: זיהוי שחקן ה-AI Operative לצורכי רישום הניחוש
    const playersSnap = await get(ref(db, `lobbies/${gameId}/players`));
    const allPlayers = playersSnap.val() || {};
    const aiPlayer = Object.values(allPlayers).find(
      (p) =>
        p.team?.toLowerCase() === team.toLowerCase() &&
        p.isAI &&
        !p.isSpymaster
    );
    const aiUserID = aiPlayer?.userID;

    // שלב 10: עיכוב לפני תחילת הניחושים לסנכרון נכון
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // שלב 11: לולאת ביצוע הניחושים - אחד אחד עם עיכובי זמן ריאליסטיים
    for (const word of limitedGuesses) {
      // מציאת הקלף המתאים לניחוש
      const card = allCards.find((c) => c.word === word && !c.isRevealed);
      if (!card) continue;

      // חיפוש אלמנט הלוח בדף לטריגר הניחוש
      const board = document.getElementById("board-card-click-sim");
      if (!board) break;

      // שליחת אירוע מותאם לסימולציית לחיצת AI על הקלף
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

      // עיכוב בין ניחושים - נותן תחושה טבעית של חשיבה
      await new Promise((res) => setTimeout(res, 1200));

      // שלב 12: בדיקת תוצאת הניחוש לקביעת המשך הפעולה
      const guessType =
        card.team?.toLowerCase() === team.toLowerCase()
          ? "correct"      // ניחוש נכון - ממשיך
          : card.team?.toLowerCase() === "neutral"
          ? "neutral"      // נייטרלי - מסיים תור
          : card.team?.toLowerCase() === "assassin"
          ? "assassin"     // מתנקש - מפסיד
          : "opponent";    // יריב - מסיים תור

      // אם הניחוש לא נכון - עוצר את הלולאה (כללי Codenames)
      if (guessType !== "correct") {
        break;
      }
    }

    // שלב 13: עיכוב לאחר סיום הניחושים
    await new Promise(resolve => setTimeout(resolve, 200));

    // שלב 14: ניקוי הרמז הנוכחי וסיום התור
    await clearLastClue(gameId);
    
    // עיכוב לפני סיום התור להבטחת סדר כרונולוגי נכון
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // שלב 15: סיום התור הרשמי - מעבר לצוות הבא
    await endTurnFromClient(gameId, team);
  } catch (err) {
    console.error("❌ שגיאה בניחושי AI:", err);
  } finally {
    // שלב 16: ניקוי וסיום - שחרור דגלים ונעילות (תמיד מתבצע)
    isAIGuessing[team] = false;
    await set(lockRef, "done");
  }
};

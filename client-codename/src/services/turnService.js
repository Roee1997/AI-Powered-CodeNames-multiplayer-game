/**
 * Turn Service - שירות ניהול תורות במשחק Codenames
 * 
 * אחראי על:
 * - סיום תורות והעברה לצוות הבא
 * - ניקוי רמזים קודמים
 * - סנכרון מצב התור בין Firebase ומסד הנתונים
 * - מניעת קונפליקטים ברזולוציה בעת מעבר תורות
 * - ניהול נעילות לטיפול בגישה בו זמנית
 * 
 * תכונות מתקדמות:
 * - מנגנון נעילה חכם למניעת מעבר תורות כפול
 * - שחרור נעילות AI למניעת התנגשויות
 * - סנכרון עם מסד נתונים SQL דרך stored procedures
 * - טיפול בשגיאות וגיבוי במקרה של כשל
 */

import { ref, runTransaction, set } from "firebase/database";
import { db } from "../../firebaseConfig";
import API_BASE from "../config/api";
import { setTurn } from "./firebaseService";

/**
 * מנקה את הרמז האחרון מ-Firebase
 * פונקציה פשוטה לאיפוס הרמז הנוכחי בתום התור
 * 
 * @param {string} gameId - מזהה המשחק
 * @returns {Promise<void>}
 */
export const clearLastClue = async (gameId) => {
  const clueRef = ref(db, `games/${gameId}/lastClue`);
  await set(clueRef, null);
};

/**
 * פונקציה מרכזית לסיום תור והעברה לצוות הבא
 * מנהלת את כל המורכבות של מעבר תורות במשחק מרובה משתתפים
 * 
 * תהליך הפעולה:
 * 1. יצירת נעילה למניעת מעבר תורות כפול
 * 2. קריאה לשרת לביצוע stored procedure לעדכון התור
 * 3. עדכון מצב התור ב-Firebase
 * 4. ניקוי נעילות AI של הצוות הנוכחי
 * 5. שחרור הנעילה
 * 
 * מנגנון הנעילה:
 * - משתמש ב-Firebase transactions למניעת race conditions
 * - כל תהליך מעבר תור נעול עד להשלמתו
 * - התהליך מוגן מפני כשלים עם finally block
 * 
 * @param {string} gameId - מזהה המשחק
 * @param {string} currentTurn - הצוות שהתור שלו מסתיים (Red/Blue)
 * @param {string} userId - מזהה המשתמש שמבצע את הפעולה (לצורכי לוגים)
 * @returns {Promise<void>}
 */
export const endTurnFromClient = async (gameId, currentTurn, userId = "unknown") => {
  // שלב 1: יצירת נעילה חכמה למניעת מעבר תורות מקביל
  const lockRef = ref(db, `games/${gameId}/turnInProgress`);

  try {
    // ניסיון לרכוש נעילה באמצעות Firebase transaction
    // מוודא שרק תהליך אחד יכול לעבור תור בכל רגע נתון
    const result = await runTransaction(lockRef, (current) => {
      // אם כבר יש נעילה פעילה - מחזיר undefined (transaction נכשל)
      if (current && current.lockedBy) {
        return; // מישהו אחר כבר עוסק במעבר תור
      }

      // יצירת נעילה חדשה עם פרטי המשתמש וזמן
      return {
        lockedBy: userId,              // מי ביצע את הנעילה
        timestamp: Date.now(),         // מתי הנעילה נוצרה
      };
    });

    // אם הטרנזקציה נכשלה (מישהו אחר כבר נעל) - יוצא מהפונקציה
    if (!result.committed) {
      console.log(`🔒 Turn switch already in progress for game ${gameId} - skipping`);
      return;
    }

    console.log(`🔄 Starting turn switch for game ${gameId}, team ${currentTurn} -> ${currentTurn === "Red" ? "Blue" : "Red"}`);

    // שלב 2: קריאה לשרת לביצוע מעבר התור במסד הנתונים
    // השרת מפעיל stored procedure sp_SwitchTurn שמטפל בכל הלוגיקה העסקית
    const bodyToSend = { GameID: gameId, Team: currentTurn };
    console.log(`📤 Calling server API to switch turn:`, bodyToSend);
    
    const res = await fetch(`${API_BASE}/api/turns/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyToSend),
    });

    const data = await res.json();
    console.log(`📥 Server response for turn switch:`, data);

    // שלב 3: בדיקת תקינות התשובה מהשרת
    const turnId = data.turnID ?? data.TurnID;
    if (!res.ok || turnId == null || turnId === -1) {
      throw new Error("🛑 העברת תור נכשלה – אולי תור פתוח עדיין קיים או שגיאה בשרת");
    }

    console.log(`✅ Turn switch successful, new turn ID: ${turnId}`);

    // שלב 4: עדכון מצב התור ב-Firebase לסנכרון עם כל הלקוחות
    const nextTurn = currentTurn === "Red" ? "Blue" : "Red";
    
    // עדכון מזהה התור החדש שהתקבל מהשרת
    await set(ref(db, `games/${gameId}/currentTurnId`), turnId);
    console.log(`📝 Updated currentTurnId in Firebase: ${turnId}`);

    // שלב 5: ניקוי נעילות AI של הצוות הנוכחי
    // חשוב למניעת התנגשויות כאשר הצוות הבא יתחיל לפעול
    await set(ref(db, `games/${gameId}/aiLock/${currentTurn}`), null);
    await set(ref(db, `games/${gameId}/aiGuessLock/${currentTurn}`), null);
    console.log(`🤖 Cleared AI locks for team ${currentTurn}`);
    
    // עדכון זמן תחילת התור החדש לצורכי timeout tracking
    await set(ref(db, `games/${gameId}/turnStart`), Date.now());
    
    // עדכון הצוות שתורו לשחק כעת - פונקציה מ-firebaseService
    await setTurn(gameId, nextTurn);
    console.log(`🔄 Turn switched successfully from ${currentTurn} to ${nextTurn}`);

  } catch (err) {
    // שלב 6: טיפול בשגיאות - רישום מפורט לדיבוג
    console.error("❌ שגיאה כללית בהעברת תור:", {
      error: err.message,
      gameId,
      currentTurn,
      userId,
      timestamp: new Date().toISOString()
    });
    
    // זריקת השגיאה מחדש למעלה במעלה בקרה אם צריך
    // throw err; // לא זורק כדי לא לקרוס את המשחק
  } finally {
    // שלב 7: שחרור הנעילה - חובה לבצע תמיד
    // גם אם הייתה שגיאה, הנעילה חייבת להשתחרר
    await set(lockRef, null);
    console.log(`🔓 Turn lock released for game ${gameId}`);
  }
};

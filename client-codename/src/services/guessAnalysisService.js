import { toast } from "react-toastify";
import API_BASE from "../config/api";

/**
 * מחשב ניתוח מיידי לניחוש במצב המדעי
 * @param {Object} params - פרמטרים לניתוח
 * @param {string} params.gameId - מזהה משחק
 * @param {string} params.guessedWord - המילה שנוחשה
 * @param {string} params.clueWord - מילת הרמז הנוכחית
 * @param {Array} params.allWords - כל המילים בלוח
 * @param {string} params.guessResult - תוצאת הניחוש (correct/opponent/neutral/assassin)
 * @param {string} params.team - הקבוצה הנוכחית
 * @returns {Promise<Object>} - ניתוח הניחוש
 */
export const analyzeGuess = async ({ gameId, guessedWord, clueWord, allWords, guessResult, team }) => {
  try {
    const response = await fetch(`${API_BASE}/api/ClueAnalysis/guess-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        guessedWord,
        clueWord,
        allWords,
        guessResult,
        team
      })
    });

    if (!response.ok) {
      console.warn("🔍 Could not get guess analysis:", response.status);
      return null;
    }

    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error("❌ Error in guess analysis:", error);
    return null;
  }
};

/**
 * מציג הודעת ניתוח מותאמת לניחוש
 * @param {Object} analysis - תוצאות הניתוח
 * @param {string} guessResult - תוצאת הניחוש
 */
export const showGuessAnalysis = (analysis, guessResult) => {
  if (!analysis) return;

  const { similarity, ranking, totalWords, insights } = analysis;
  
  // יצירת הודעה בהתאם לתוצאת הניחוש
  let message = "";
  let emoji = "";
  
  switch (guessResult) {
    case "correct":
      emoji = "🎯";
      if (similarity > 0.8) {
        message = `${emoji} מצוין! דמיון של ${Math.round(similarity * 100)}% - הקשר החזק ביותר בלוח!`;
      } else if (similarity > 0.6) {
        message = `${emoji} בחירה טובה! דמיון של ${Math.round(similarity * 100)}% (מקום ${ranking} מתוך ${totalWords})`;
      } else {
        message = `${emoji} הצלחת! דמיון של ${Math.round(similarity * 100)}% - אינטואיציה מעולה`;
      }
      break;
      
    case "opponent":
      emoji = "⚠️";
      if (similarity > 0.7) {
        message = `${emoji} קשר חזק (${Math.round(similarity * 100)}%) אבל לקבוצה היריבה - בחירה מסוכנת!`;
      } else {
        message = `${emoji} דמיון של ${Math.round(similarity * 100)}% לרמז, אבל היה של הקבוצה האחרת`;
      }
      break;
      
    case "neutral":
      emoji = "🟡";
      if (similarity > 0.6) {
        message = `${emoji} קשר חזק (${Math.round(similarity * 100)}%) לרמז, אבל זה היה נייטרלי`;
      } else {
        message = `${emoji} דמיון נמוך (${Math.round(similarity * 100)}%) - נייטרלי כפי שצפוי`;
      }
      break;
      
    case "assassin":
      emoji = "💀";
      if (similarity > 0.5) {
        message = `${emoji} המתנקש! דמיון של ${Math.round(similarity * 100)}% לרמז - קשר מטעה`;
      } else {
        message = `${emoji} המתנקש! דמיון נמוך (${Math.round(similarity * 100)}%) - מזל רע`;
      }
      break;
  }
  
  // הוספת תובנה נוספת אם קיימת
  if (insights) {
    message += `\n💡 ${insights}`;
  }
  
  // הצגת ההודעה כ-toast עם עיצוב מותאם
  const toastOptions = {
    position: "top-center",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    style: {
      backgroundColor: getToastColor(guessResult),
      color: "white",
      fontWeight: "bold",
      fontSize: "14px",
      borderRadius: "10px",
      border: `2px solid ${getBorderColor(guessResult)}`
    }
  };
  
  toast(message, toastOptions);
};

/**
 * מחזיר צבע רקע לטוסט בהתאם לתוצאה
 */
const getToastColor = (guessResult) => {
  switch (guessResult) {
    case "correct": return "#22c55e";
    case "opponent": return "#ef4444"; 
    case "neutral": return "#f59e0b";
    case "assassin": return "#7c2d12";
    default: return "#6b7280";
  }
};

/**
 * מחזיר צבע גבול לטוסט בהתאם לתוצאה
 */
const getBorderColor = (guessResult) => {
  switch (guessResult) {
    case "correct": return "#16a34a";
    case "opponent": return "#dc2626";
    case "neutral": return "#d97706";
    case "assassin": return "#991b1b";
    default: return "#4b5563";
  }
};

/**
 * בודק אם ניתוח ניחושים זמין עבור המשחק הנוכחי
 * @param {string} gameType - סוג המשחק
 * @returns {boolean} - האם הניתוח זמין
 */
export const isGuessAnalysisAvailable = (gameType) => {
  return gameType === "scientific";
};
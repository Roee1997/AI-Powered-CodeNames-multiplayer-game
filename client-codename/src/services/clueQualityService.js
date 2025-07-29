import API_BASE from "../config/api";

/**
 * מנתח איכות רמז בזמן אמת
 * @param {Object} params - פרמטרים לניתוח
 * @param {string} params.clueWord - מילת הרמז להיתחת
 * @param {Array} params.teamWords - מילים של הקבוצה
 * @param {Array} params.opponentWords - מילים של הקבוצה היריבה  
 * @param {Array} params.neutralWords - מילים נייטרליות
 * @param {string} params.assassinWord - מילת המתנקש
 * @returns {Promise<Object>} - ניתוח איכות הרמז
 */
export const analyzeClueQuality = async ({ clueWord, teamWords, opponentWords, neutralWords, assassinWord }) => {
  try {
    // לוג מפורט של הנתונים הנשלחים
    console.log("🚀 [ClueQuality] Sending to server:", {
      clueWord,
      teamWords: teamWords.slice(0, 3), // רק 3 הראשונות
      teamWordsCount: teamWords.length,
      opponentWordsCount: opponentWords.length,
      neutralWordsCount: neutralWords.length,
      assassinWord
    });

    const response = await fetch(`${API_BASE}/api/ClueAnalysis/clue-quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clueWord,
        teamWords,
        opponentWords,
        neutralWords,
        assassinWord
      })
    });

    if (!response.ok) {
      console.warn("🔍 Could not get clue quality analysis:", response.status);
      return null;
    }

    const analysis = await response.json();
    
    // לוג מפורט לדיבאג
    console.log("🔍 [ClueQuality] Message:", analysis?.suggestions);
    console.log("🔍 [ClueQuality] Full Response:", analysis);
    
    return analysis;
  } catch (error) {
    console.error("❌ Error in clue quality analysis:", error);
    return null;
  }
};

/**
 * מחזיר צבע על פי ציון איכות הרמז
 * @param {number} qualityScore - ציון איכות (0-100)
 * @param {string} riskLevel - רמת סיכון (low/medium/high)
 * @returns {string} - צבע CSS
 */
export const getQualityColor = (qualityScore, riskLevel) => {
  if (riskLevel === "high") return "#ef4444"; // אדום - מסוכן
  if (riskLevel === "medium") return "#f59e0b"; // כתום - זהיר
  if (qualityScore > 80) return "#22c55e"; // ירוק - מעולה
  if (qualityScore > 60) return "#3b82f6"; // כחול - טוב
  return "#6b7280"; // אפור - בסדר
};

/**
 * מחזיר אמוג'י על פי ציון איכות הרמז
 * @param {number} qualityScore - ציון איכות (0-100)
 * @param {string} riskLevel - רמת סיכון
 * @returns {string} - אמוג'י
 */
export const getQualityEmoji = (qualityScore, riskLevel) => {
  if (riskLevel === "high") return "⚠️";
  if (riskLevel === "medium") return "🟡";
  if (qualityScore > 80) return "🎯";
  if (qualityScore > 60) return "✅";
  return "🤔";
};

/**
 * יוצר פידבק חכם על איכות הרמז
 * @param {Object} analysis - תוצאות ניתוח האיכות
 * @returns {string} - הודעת פידבק
 */
export const generateQualityFeedback = (analysis) => {
  if (!analysis) return "";
  
  const { qualityScore, riskLevel, suggestions, teamSimilarities } = analysis;
  const emoji = getQualityEmoji(qualityScore, riskLevel);
  
  let feedback = `${emoji} איכות: ${Math.round(qualityScore)}%`;
  
  if (teamSimilarities && teamSimilarities.length > 0) {
    const topMatch = teamSimilarities[0];
    if (topMatch.similarity > 0.7) {
      feedback += ` | קשר חזק ל-"${topMatch.word}"`;
    }
  }
  
  if (suggestions) {
    feedback += ` | ${suggestions}`;
  }
  
  return feedback;
};

/**
 * דיבאונסר לביצוע ניתוח רק אחרי שההקלדה נפסקה
 * @param {Function} func - הפונקציה להרצה
 * @param {number} delay - זמן המתנה (מילישניות)
 * @returns {Function} - הפונקציה המדובנסת
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};
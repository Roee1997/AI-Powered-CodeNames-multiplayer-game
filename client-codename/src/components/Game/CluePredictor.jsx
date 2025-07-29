import React, { useState, useEffect } from "react";
import { analyzeClueQuality, getQualityColor, getQualityEmoji, generateQualityFeedback, debounce } from "../../services/clueQualityService";

const CluePredictor = ({ clueWord, boardCards, currentTeam, gameType }) => {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // הפרדת הקלפים לקטגוריות
  const getCardsByCategory = () => {
    if (!boardCards || boardCards.length === 0) return { teamWords: [], opponentWords: [], neutralWords: [], assassinWord: "" };

    console.log("🔍 [CluePredictor] Analyzing board cards:", boardCards.length, "cards");
    console.log("🔍 [CluePredictor] Current team:", currentTeam);
    
    // הדפס כמה דוגמאות לבדיקה
    if (boardCards.length > 0) {
      console.log("🔍 [CluePredictor] Sample card:", boardCards[0]);
    }

    const teamWords = boardCards.filter(card => card.team === currentTeam).map(card => card.word);
    const opponentWords = boardCards.filter(card => card.team !== currentTeam && card.team !== "Neutral" && card.team !== "Assassin").map(card => card.word);
    const neutralWords = boardCards.filter(card => card.team === "Neutral").map(card => card.word);
    const assassinCard = boardCards.find(card => card.team === "Assassin");
    const assassinWord = assassinCard ? assassinCard.word : "";

    console.log("🔍 [CluePredictor] Categories:");
    console.log("  Team words:", teamWords);
    console.log("  Opponent words:", opponentWords);
    console.log("  Neutral words:", neutralWords);
    console.log("  Assassin word:", assassinWord);

    return { teamWords, opponentWords, neutralWords, assassinWord };
  };

  // דיבאונסד פונקציה לניתוח
  const debouncedAnalyze = debounce(async (word) => {
    if (!word || word.length < 2) {
      setAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    const { teamWords, opponentWords, neutralWords, assassinWord } = getCardsByCategory();
    
    if (teamWords.length === 0) {
      setIsAnalyzing(false);
      return;
    }

    try {
      const result = await analyzeClueQuality({
        clueWord: word,
        teamWords,
        opponentWords,
        neutralWords,
        assassinWord
      });
      
      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing clue:", error);
      setAnalysis(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, 800); // המתן 800ms אחרי שההקלדה נפסקה

  useEffect(() => {
    if (gameType !== "scientific" || !clueWord) {
      setAnalysis(null);
      return;
    }

    debouncedAnalyze(clueWord.trim().toLowerCase());
  }, [clueWord, gameType]);

  // אל תציג כלום אם לא במצב מדעי או אין רמז
  if (gameType !== "scientific" || !clueWord || clueWord.length < 2) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 1000,
        marginTop: 8,
        padding: "8px 12px",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        border: "2px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        fontSize: 12,
        fontWeight: 500,
        minHeight: 40,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      {isAnalyzing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b7280" }}>
          <div 
            style={{
              width: 12,
              height: 12,
              border: "2px solid #e5e7eb",
              borderTop: "2px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }}
          />
          <span>מנתח איכות רמז...</span>
        </div>
      ) : analysis ? (
        <>
          {/* הודעה פשוטה במקום ציונים */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ 
              color: analysis.suggestions?.includes("רמז טוב") ? "#22c55e" : 
                     analysis.suggestions?.includes("רמז בסדר") ? "#f59e0b" : 
                     analysis.suggestions?.includes("זהירות") ? "#ef4444" : "#6b7280",
              fontSize: 13,
              fontWeight: 600,
              flex: 1
            }}>
              {analysis.suggestions || "רמז נבדק"}
            </div>
          </div>

          {/* מילה מומלצת (אם יש) */}
          {analysis.teamSimilarities && analysis.teamSimilarities.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <div 
                style={{
                  color: "#059669",
                  backgroundColor: "#ecfdf5",
                  padding: "2px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 600,
                  border: "1px solid #a7f3d0"
                }}
              >
                🎯 {analysis.teamSimilarities[0].word}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "#9ca3af", fontSize: 11 }}>
          💡 הקלד רמז לקבלת ניתוח בזמן אמת
        </div>
      )}

      {/* CSS Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CluePredictor;
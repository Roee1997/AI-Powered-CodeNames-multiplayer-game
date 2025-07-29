import { ref, set } from "firebase/database";
import { db } from "../../firebaseConfig";
import API_BASE from "../config/api";

export const sendEmbeddingAnalysis = async ({ gameId, turnId, clue, team, guesses, allWords }) => {
  try {
    const response = await fetch(`${API_BASE}/api/ClueAnalysis/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, turnId, clue, team, guesses, allWords })
    });

    if (!response.ok) {
      throw new Error("Failed to generate analysis");
    }

    const result = await response.json();

    // שמירה ל־Firebase
    const analysisRef = ref(db, `games/${gameId}/analysis/${turnId}`);
    await set(analysisRef, result);

    console.log("📊 Embedding analysis saved to Firebase");
  } catch (err) {
    console.error("🔥 Error in embedding analysis:", err.message);
  }
};

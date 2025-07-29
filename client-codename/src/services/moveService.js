import API_BASE from "../config/api";

export const logMove = async ({ gameId, turnId, userId, wordId, result }) => {
  try {
    const res = await fetch(`${API_BASE}/api/moves/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        turnId,
        userId,
        wordId,
        result
      })
    });
    const data = await res.json();
    return data.success;
  } catch (err) {
    console.error("❌ שגיאה בשליחת מהלך:", err);
    return false;
  }
};

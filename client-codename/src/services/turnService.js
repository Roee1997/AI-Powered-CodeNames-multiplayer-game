import { ref, runTransaction, set } from "firebase/database";
import { db } from "../../firebaseConfig";
import API_BASE from "../config/api";
import { setTurn } from "./firebaseService";

// 🧹 איפוס רמז אחרון
export const clearLastClue = async (gameId) => {
  const clueRef = ref(db, `games/${gameId}/lastClue`);
  await set(clueRef, null);
};

// 🧠 פונקציה לסיום תור והתחלת תור חדש עם נעילה חכמה – גרסה חדשה עם SWITCH
export const endTurnFromClient = async (gameId, currentTurn, userId = "unknown") => {
  const lockRef = ref(db, `games/${gameId}/turnInProgress`);

  try {
    // 🔐 ניסיון לנעול את התור דרך טרנזקציה
    const result = await runTransaction(lockRef, (current) => {
      if (current && current.lockedBy) {
        return; // מישהו כבר נעל
      }

      return {
        lockedBy: userId,
        timestamp: Date.now(),
      };
    });

    if (!result.committed) {
      return;
    }


    // 📦 קריאה ל־API חדש שמריץ sp_SwitchTurn
    const bodyToSend = { GameID: gameId, Team: currentTurn };
    const res = await fetch(`${API_BASE}/api/turns/switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyToSend),
    });

    const data = await res.json();

    const turnId = data.turnID ?? data.TurnID;
    if (!res.ok || turnId == null || turnId === -1) {
      throw new Error("🛑 העברת תור נכשלה – אולי תור פתוח עדיין קיים");
    }

    // 🗃️ שמירת המידע ב-Firebase
    const nextTurn = currentTurn === "Red" ? "Blue" : "Red";
    await set(ref(db, `games/${gameId}/currentTurnId`), turnId);

    // Clear both AI locks for current team to prevent interference with next team
    await set(ref(db, `games/${gameId}/aiLock/${currentTurn}`), null);
    await set(ref(db, `games/${gameId}/aiGuessLock/${currentTurn}`), null);
    await set(ref(db, `games/${gameId}/turnStart`), Date.now());
    await setTurn(gameId, nextTurn);


  } catch (err) {
    console.error("❌ שגיאה כללית בהעברת תור:", err);
  } finally {
    // 🔓 שחרור נעילה בכל מקרה
    await set(lockRef, null);
  }
};

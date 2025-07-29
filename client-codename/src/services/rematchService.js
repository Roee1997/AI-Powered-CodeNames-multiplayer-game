import { ref, set, onValue, remove, get } from "firebase/database";
import { db } from "../../firebaseConfig";
import { toast } from "react-toastify";
import API_BASE from "../config/api";

/**
 * Service for handling rematch functionality
 */

// יצירת בקשת משחק חוזר חדשה
export const initiateRematch = async (gameId, initiatorId, initiatorName) => {
  try {
    const rematchRef = ref(db, `rematch/${gameId}`);
    
    // יצירת בקשת rematch חדשה
    const rematchData = {
      initiatorId,
      initiatorName,
      createdAt: Date.now(),
      votes: {
        [initiatorId]: {
          vote: true,
          name: initiatorName,
          timestamp: Date.now()
        }
      },
      status: 'voting', // voting, approved, rejected, expired
      expiresAt: Date.now() + (60 * 1000) // פג תוקף אחרי דקה
    };

    await set(rematchRef, rematchData);
    
    toast.info(`${initiatorName} מבקש משחק חוזר! כל השחקנים צריכים להצביע.`);
    return true;
  } catch (error) {
    console.error("Error initiating rematch:", error);
    toast.error("שגיאה ביצירת בקשת משחק חוזר");
    return false;
  }
};

// הצבעה על בקשת משחק חוזר
export const voteForRematch = async (gameId, playerId, playerName, vote) => {
  try {
    const voteRef = ref(db, `rematch/${gameId}/votes/${playerId}`);
    
    await set(voteRef, {
      vote,
      name: playerName,
      timestamp: Date.now()
    });

    const message = vote 
      ? `${playerName} הסכים למשחק חוזר` 
      : `${playerName} דחה את המשחק החוזר`;
    
    toast.info(message);
    return true;
  } catch (error) {
    console.error("Error voting for rematch:", error);
    toast.error("שגיאה בהצבעה");
    return false;
  }
};

// בדיקת סטטוס הצבעת משחק חוזר
export const checkRematchStatus = async (gameId, allPlayers) => {
  try {
    const rematchRef = ref(db, `rematch/${gameId}`);
    const snapshot = await get(rematchRef);
    
    if (!snapshot.exists()) {
      return { status: 'none' };
    }

    const rematchData = snapshot.val();
    
    // בדיקת פג תוקף
    if (Date.now() > rematchData.expiresAt) {
      await remove(rematchRef);
      return { status: 'expired' };
    }

    const votes = rematchData.votes || {};
    const totalPlayers = allPlayers.filter(p => !p.isAI).length; // רק שחקנים אמיתיים
    const votedPlayers = Object.keys(votes).length;
    const approvedVotes = Object.values(votes).filter(v => v.vote).length;
    const rejectedVotes = Object.values(votes).filter(v => !v.vote).length;

    // אם כל השחקנים הצביעו בעד
    if (approvedVotes === totalPlayers) {
      return { status: 'approved', votes, totalPlayers, votedPlayers };
    }

    // אם יש דחייה אחת לפחות
    if (rejectedVotes > 0) {
      return { status: 'rejected', votes, totalPlayers, votedPlayers };
    }

    // עדיין בהצבעה
    return { 
      status: 'voting', 
      votes, 
      totalPlayers, 
      votedPlayers,
      expiresAt: rematchData.expiresAt,
      initiatorName: rematchData.initiatorName
    };
  } catch (error) {
    console.error("Error checking rematch status:", error);
    return { status: 'error' };
  }
};

// יצירת משחק חדש עם אותם שחקנים דרך שרת API
export const createRematchGame = async (originalGameId, allPlayers, creatorUserId) => {
  try {
    // בדיקה אם כבר נוצר משחק חוזר למשחק הזה
    const existingNotification = await get(ref(db, `rematchNotifications/${originalGameId}`));
    if (existingNotification.exists()) {
      toast.info("משחק חוזר כבר נוצר!");
      const notification = existingNotification.val();
      return notification.newGameId;
    }

    // סינון שחקנים אמיתיים (לא AI)
    const humanPlayers = allPlayers.filter(player => !player.isAI);
    
    if (humanPlayers.length === 0) {
      toast.error("אין שחקנים זמינים למשחק חוזר");
      return null;
    }

    // יצירת payload למשחק חדש דרך השרת
    const gamePayload = {
      CreatedBy: creatorUserId
    };

    // יצירת המשחק דרך השרת
    const response = await fetch(`${API_BASE}/api/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(gamePayload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "שגיאה ביצירת המשחק");
    }

    const data = await response.json();
    const newGameId = data.GameID || data.gameID;

    if (!newGameId) {
      throw new Error("לא התקבל מזהה משחק מהשרת");
    }

    // יצירת לובי ב-Firebase עם כל השחקנים
    const lobbyRef = ref(db, `lobbies/${newGameId}`);
    const lobbyData = {
      createdBy: creatorUserId,
      createdAt: Date.now(),
      status: 'waiting',
      isRematch: true, // סימון שזה משחק חוזר
      originalGameId: originalGameId, // קישור למשחק המקורי
      players: {},
      settings: {
        gameType: 'classic',
        maxPlayers: 8
      }
    };

    // הוספת כל השחקנים ללובי החדש
    humanPlayers.forEach(player => {
      lobbyData.players[player.userID] = {
        userID: player.userID,
        username: player.username,
        team: null, // יאתחל בלובי החדש
        role: null,
        isSpymaster: false,
        joinedAt: Date.now(),
        isFromRematch: true, // סימון שזה שחקן ממשחק חוזר
        isCreator: player.userID === creatorUserId // סימון היוצר
      };
    });

    await set(lobbyRef, lobbyData);

    // שליחת הודעה לכל השחקנים על המשחק החדש (בדיקה נוספת למניעת כפילות)
    const notificationRef = ref(db, `rematchNotifications/${originalGameId}`);
    const finalCheck = await get(notificationRef);
    if (finalCheck.exists()) {
      toast.info("משחק חוזר כבר נוצר על ידי שחקן אחר!");
      return finalCheck.val().newGameId;
    }

    const notificationData = {
      newGameId: newGameId,
      message: "משחק חוזר נוצר! לחץ כאן להצטרף",
      createdAt: Date.now(),
      createdBy: creatorUserId,
      expiresAt: Date.now() + (5 * 60 * 1000) // פג תוקף אחרי 5 דקות
    };
    
    await set(notificationRef, notificationData);

    // ניקוי בקשת הrematch
    await remove(ref(db, `rematch/${originalGameId}`));

    toast.success("משחק חוזר נוצר בהצלחה! מעביר ללובי החדש...");
    return newGameId;
  } catch (error) {
    console.error("Error creating rematch game:", error);
    toast.error(`שגיאה ביצירת המשחק החוזר: ${error.message}`);
    return null;
  }
};

// האזנה לשינויים בסטטוס משחק חוזר
export const subscribeToRematchStatus = (gameId, callback) => {
  const rematchRef = ref(db, `rematch/${gameId}`);
  
  return onValue(rematchRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

// ביטול בקשת משחק חוזר
export const cancelRematch = async (gameId) => {
  try {
    await remove(ref(db, `rematch/${gameId}`));
    toast.info("בקשת המשחק החוזר בוטלה");
    return true;
  } catch (error) {
    console.error("Error canceling rematch:", error);
    toast.error("שגיאה בביטול בקשת המשחק החוזר");
    return false;
  }
};

// בדיקה אם המשתמש כבר הצביע
export const hasUserVoted = async (gameId, userId) => {
  try {
    const voteRef = ref(db, `rematch/${gameId}/votes/${userId}`);
    const snapshot = await get(voteRef);
    return snapshot.exists();
  } catch (error) {
    console.error("Error checking if user voted:", error);
    return false;
  }
};
import React, { useEffect, useState } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation } from "react-router-dom";
import API_BASE from "../../config/api";

const OnlineFriendsList = ({ userId, gameId: currentGameId }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [friends, setFriends] = useState([]);
  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    if (!userId) return;

    const fetchFriends = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/friends/${userId}`);
        const data = await res.json();

        let friendsArray = [];
        if (Array.isArray(data)) {
          friendsArray = data;
        } else if (typeof data === "object" && data !== null) {
          friendsArray = Object.values(data);
        }

        setFriends(friendsArray);
      } catch (err) {
        console.error("שגיאה בשליפת חברים:", err);
        setFriends([]);
      }
    };

    fetchFriends();

    const statusRef = ref(db, "playersStatus");
    onValue(statusRef, (snapshot) => {
      const allStatus = snapshot.val() || {};
      setStatusMap(allStatus);
    });
  }, [userId]);

  // Removed invitation listener - now handled globally in AuthContext

  const sendInvitation = async (friendId) => {
    try {
      // Validate required data before sending
      if (!currentGameId || !userId) {
        toast.error("לא ניתן לשלוח הזמנה - חסרים נתונים");
        return;
      }

      await set(ref(db, `invitations/${friendId}`), {
        from: userId,
        fromName: user?.displayName || "שחקן אלמוני",
        gameId: currentGameId,
        timestamp: Date.now(),
      });
      toast.success("ההזמנה נשלחה בהצלחה!");
    } catch (err) {
      console.error("שגיאה בשליחת הזמנה:", err);
      toast.error("אירעה שגיאה בשליחת ההזמנה.");
    }
  };

  const grouped = {
    online: [],
    inGame: [],
    offline: [],
  };

  friends.forEach((friend) => {
    const status = statusMap[friend.UserID] || {};
    if (status.online && !status.inGame) {
      grouped.online.push(friend);
    } else if (status.online && status.inGame) {
      grouped.inGame.push(friend);
    } else {
      grouped.offline.push(friend);
    }
  });

  const renderGroup = (title, list) => (
    <>
      {list.length > 0 && (
        <>
          <h3 className="text-white font-bold text-lg mt-6 mb-3 flex items-center gap-2">
            {title === "חברים מחוברים" && "🟢"}
            {title === "חברים במשחק" && "🎮"}
            {title === "חברים מנותקים" && "⭕"}
            {title}
          </h3>
          <div className="space-y-2">
            {list.map((friend) => {
              const status = statusMap[friend.UserID] || {};
              const isOnline = status.online;
              const isInGame = status.inGame;

              const statusIcon = isInGame
                ? "🎮"
                : isOnline
                ? "🟢"
                : "⭕";

              return (
                <div
                  key={friend.UserID}
                  className="bg-white/10 backdrop-blur p-3 rounded-lg shadow-lg border border-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  <div className="flex items-center w-full justify-between gap-3">
                    <span className="text-lg">{statusIcon}</span>
                    <span className="flex-1 text-center font-medium text-gray-200">{friend.Username}</span>
                    {isOnline && !isInGame ? (
                      <button
                        onClick={() => sendInvitation(friend.UserID)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium shadow-lg hover:shadow-xl active:scale-95"
                      >
                        הזמן למשחק
                      </button>
                    ) : (
                      <span className="text-sm text-gray-400 italic">לא זמין להזמנה</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="space-y-2 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 -mr-2">
      {renderGroup("חברים מחוברים", grouped.online)}
      {renderGroup("חברים במשחק", grouped.inGame)}
      {renderGroup("חברים מנותקים", grouped.offline)}
    </div>
  );
};

export default OnlineFriendsList;

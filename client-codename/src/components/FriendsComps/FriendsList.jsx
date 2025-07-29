import React, { useEffect, useState } from "react";
import { auth } from "../../../firebaseConfig";
import {
  subscribeToFriendSync,
  notifyFriendSync,
  subscribeToChatMeta
} from "../../services/firebaseService";
import { showToast } from "../../services/toastService";
import ChatWindow from "../Chat/ChatWindow";
import API_BASE from "../../config/api";
import { useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { db } from "../../../firebaseConfig";

const FriendsList = () => {
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState("");
  const [openChatId, setOpenChatId] = useState(null); // Only one chat open at a time
  const [unreadMessages, setUnreadMessages] = useState({});
  const [invitingFriends, setInvitingFriends] = useState(new Set()); // Track friends being invited

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    fetchFriends();

    const unsubscribeSync = subscribeToFriendSync(userId, () => {
      fetchFriends();
    });

    return () => unsubscribeSync();
  }, [userId]);

  useEffect(() => {
    if (!userId || friends.length === 0) return;

    const unsubscribes = friends.map((friend) =>
      subscribeToChatMeta(userId, friend.UserID, (hasNew) => {
        setUnreadMessages((prev) => ({
          ...prev,
          [friend.UserID]: hasNew
        }));
      })
    );

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [friends, userId]);

  const fetchFriends = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/${userId}`);
      if (!res.ok) throw new Error("שגיאה בטעינת רשימת החברים.");

      const data = await res.json();
      setFriends(data);
    } catch (err) {
      setError("שגיאה בטעינת רשימת החברים.");
    }
  };

  const handleRemoveFriend = async (friendID) => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/remove`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userID: userId,
          friendID: friendID
        })
      });

      const data = await res.json();

      if (res.ok) {
        showToast("החבר הוסר בהצלחה", "success");
        await notifyFriendSync(userId);
        await notifyFriendSync(friendID);
      } else {
        showToast(data.message || "שגיאה בהסרת חבר", "error");
      }

      fetchFriends();
    } catch (error) {
      showToast("שגיאה בהסרת חבר", "error");
    }
  };

  const toggleChat = (friendID) => {
    setOpenChatId((prev) => (prev === friendID ? null : friendID));
    setUnreadMessages((prev) => ({
      ...prev,
      [friendID]: false
    }));
  };

  const handleInviteFriend = async (friendId, friendName) => {
    if (invitingFriends.has(friendId)) return; // Prevent double invitations
    
    try {
      setInvitingFriends(prev => new Set([...prev, friendId]));
      
      // First, try to create a game or get existing waiting game
      const gamePayload = {
        CreatedBy: userId,
        Status: "Waiting",
        CreationDate: null,
        WinningTeam: null,
        GameID: null
      };

      const response = await fetch(`${API_BASE}/api/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gamePayload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "שגיאה ביצירת משחק");
      }

      const data = await response.json();
      const gameId = data.gameID; // Use correct property name from API response
      
      // Validate that gameId is not undefined
      if (!gameId) {
        console.error("GameID not found in response:", data);
        throw new Error("לא התקבל מזהה משחק מהשרת");
      }

      // Send invitation to friend
      await set(ref(db, `invitations/${friendId}`), {
        from: userId,
        fromName: currentUser?.displayName || currentUser?.email || "חבר",
        gameId: gameId,
        timestamp: Date.now(),
      });

      // Navigate to the game lobby
      navigate(`/game-lobby/${gameId}`, { state: { isCreator: true } });

      // Show success message
      if (data.isExistingGame) {
        showToast(`🎮 הזמנה נשלחה ל-${friendName} למשחק הממתין שלך!`, "success");
      } else {
        showToast(`🎮 משחק נוצר והזמנה נשלחה ל-${friendName}!`, "success");
      }

    } catch (error) {
      console.error("שגיאה בהזמנת חבר:", error);
      showToast(`❌ שגיאה בהזמנת ${friendName}: ${error.message}`, "error");
    } finally {
      setInvitingFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const openFriend = friends.find((f) => f.UserID === openChatId);

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}

      <div className="flex-1 overflow-y-auto">
        {friends.length === 0 ? (
          <div className="empty-state">
            <span className="emoji">😔</span>
            <div className="title">אין לך חברים כרגע</div>
            <div className="subtitle">התחל לחפש חברים חדשים!</div>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend, index) => (
              <div
                key={friend.UserID}
                className="friend-card friend-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center">
                    <div className="user-avatar blue">
                      {friend.Username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-gray-800">{friend.Username}</p>
                      <p className="text-sm text-gray-600">{friend.Email}</p>
                      <p className="text-xs text-gray-400">
                        חבר מאז: {friend.FriendshipDate}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mr-auto">
                    <button
                      className="btn-primary"
                      onClick={() => handleInviteFriend(friend.UserID, friend.Username)}
                      disabled={invitingFriends.has(friend.UserID)}
                    >
                      {invitingFriends.has(friend.UserID) ? "מזמין..." : "הזמן חבר"}
                    </button>
                    <button
                      className="btn-success relative"
                      onClick={() => toggleChat(friend.UserID)}
                    >
                      הודעה
                      {unreadMessages[friend.UserID] && (
                        <span className="unread-indicator"></span>
                      )}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleRemoveFriend(friend.UserID)}
                    >
                      הסר חבר
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ChatWindow - only one at a time, fixed at bottom left */}
      {openChatId && openFriend && (
        <ChatWindow
          currentUserId={userId}
          friendId={openFriend.UserID}
          friendName={openFriend.Username}
          onClose={() => setOpenChatId(null)}
        />
      )}
    </div>
  );
};

export default FriendsList;

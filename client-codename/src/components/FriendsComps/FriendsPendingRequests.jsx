import React, { useEffect, useState } from "react";
import { auth } from "../../../firebaseConfig";
import { subscribeToFriendSync, notifyFriendSync, subscribeToReceivedFriendRequests } from "../../services/firebaseService";
import { remove, ref } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { showToast } from "../../services/toastService";
import API_BASE from "../../config/api";

const FriendsPendingRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [error, setError] = useState("");

  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    const unsubscribeSync = subscribeToFriendSync(userId, () => {
      fetchPendingRequests();
      fetchReceivedRequests();
    });

    const unsubscribeRealtimeReceived = subscribeToReceivedFriendRequests(userId, () => {
      fetchReceivedRequests();
    });

    return () => {
      unsubscribeSync();
      unsubscribeRealtimeReceived();
    };
  }, [userId]);

  const fetchPendingRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/pending-sent/${userId}`);
      if (!res.ok) throw new Error("שגיאה בטעינת הבקשות שנשלחו.");
      const data = await res.json();
      setPendingRequests(data);
    } catch (err) {
      console.error("שגיאה:", err);
      setError("שגיאה בטעינת בקשות שנשלחו.");
      showToast("שגיאה בטעינת בקשות שנשלחו.", "error");
    }
  };

  const fetchReceivedRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/pending-received/${userId}`);
      if (!res.ok) throw new Error("שגיאה בטעינת הבקשות שהתקבלו.");
      const data = await res.json();
      setReceivedRequests(data);
    } catch (err) {
      console.error("שגיאה:", err);
      setError("שגיאה בטעינת בקשות שהתקבלו.");
      showToast("שגיאה בטעינת בקשות שהתקבלו.", "error");
    }
  };

  const handleAcceptRequest = async (senderID, receiverID) => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/accept`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderID, receiverID })
      });

      const data = await res.json();
      if (res.ok) {
        showToast("הבקשה אושרה בהצלחה.", "success");
        await notifyFriendSync(senderID);
        await notifyFriendSync(receiverID);
      } else {
        showToast(data.message || "הבקשה לא אושרה.", "error");
      }

      fetchPendingRequests();
      fetchReceivedRequests();
    } catch (error) {
      console.error("שגיאה באישור בקשה:", error);
      showToast("שגיאה באישור בקשה.", "error");
    }

    await remove(ref(db, `friendRequestsStatus/${senderID}/${receiverID}`));
  };

  const updateRequestStatus = async (senderID, receiverID, action) => {
    try {
      const res = await fetch(`${API_BASE}/api/friends/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderID, receiverID, action })
      });

      const data = await res.json();
      if (res.ok) {
        const msg = action === "cancel" ? "הבקשה בוטלה." : "הבקשה נדחתה.";
        showToast(msg, "success");
        await notifyFriendSync(senderID);
        await notifyFriendSync(receiverID);
      } else {
        showToast(data.message || "שגיאה בעדכון הבקשה.", "error");
      }

      fetchPendingRequests();
      fetchReceivedRequests();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס:", error);
      showToast("שגיאה בעדכון סטטוס.", "error");
    }

    await remove(ref(db, `friendRequestsStatus/${senderID}/${receiverID}`));
  };

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
      
      {!userId ? (
        <div className="empty-state">
          <span className="emoji">🔒</span>
          <div className="title">עליך להיות מחובר</div>
          <div className="subtitle">כדי לצפות בבקשות החברות</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* בקשות שנשלחו */}
          <div>
            <h3 className="text-lg font-bold mb-3 text-gray-800">בקשות חברות שנשלחו</h3>
            {pendingRequests.length === 0 ? (
              <div className="empty-state">
                <span className="emoji">📤</span>
                <div className="title">לא שלחת עדיין בקשות חברות</div>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((user) => (
                  <div key={user.userID} className="friend-card bg-white bg-opacity-95 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="user-avatar orange small">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800">{user.username}</span>
                    </div>
                    <button
                      className="btn-danger"
                      onClick={() => updateRequestStatus(userId, user.userID, "cancel")}
                    >
                      ביטול
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* בקשות שהתקבלו */}
          <div>
            <h3 className="text-lg font-bold mb-3 text-gray-800">בקשות חברות שהתקבלו</h3>
            {receivedRequests.length === 0 ? (
              <div className="empty-state">
                <span className="emoji">📥</span>
                <div className="title">אין לך בקשות חדשות</div>
              </div>
            ) : (
              <div className="space-y-2">
                {receivedRequests.map((user) => (
                  <div key={user.userID} className="friend-card bg-white bg-opacity-95 flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="user-avatar green small">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-800">{user.username}</span>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        className="btn-success"
                        onClick={() => handleAcceptRequest(user.userID, userId)}
                      >
                        אישור
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => updateRequestStatus(user.userID, userId, "decline")}
                      >
                        דחייה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPendingRequests;

import React, { useEffect, useState } from "react";
import { auth, db } from "../../../firebaseConfig";
import { notifyFriendSync } from "../../services/firebaseService";
import { set, ref, onValue } from "firebase/database";
import { showToast } from "../../services/toastService"; 
import API_BASE from "../../config/api";

const FriendAddRequest = ({ receiverUser }) => {
  const [hideBox, setHideBox] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser?.uid || !receiverUser?.userID) return;

    const senderID = currentUser.uid;
    const receiverID = receiverUser.userID;
    const statusRef = ref(db, `friendRequestsStatus/${senderID}/${receiverID}`);

    const unsubscribe = onValue(statusRef, (snapshot) => {
      const status = snapshot.val();
      if (status && ["Approved", "Cancelled", "Rejected"].includes(status)) {
        setHideBox(true);
      }
    });

    return () => unsubscribe();
  }, [receiverUser]);

  const handleSendRequest = async () => {
    if (!currentUser || !receiverUser?.userID) {
      showToast("שגיאה: המשתמש אינו תקף.", "error");
      return;
    }

    const senderID = currentUser.uid;
    const receiverID = receiverUser.userID;

    try {
      const res = await fetch(`${API_BASE}/api/friends/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ senderID, receiverQuery: receiverUser.username }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("בקשת החברות נשלחה בהצלחה!", "success");

        await set(ref(db, `friendRequestsStatus/${senderID}/${receiverID}`), "Pending");
        await set(ref(db, `friendRequestAlerts/${receiverID}`), true);
        await notifyFriendSync(senderID);
        await notifyFriendSync(receiverID);
      } else {
        showToast(data.message || "שליחת הבקשה נכשלה.", "error");
      }
    } catch (error) {
      console.error("שגיאה בבקשה:", error);
      showToast("אירעה שגיאה בעת שליחת הבקשה.", "error");
    }
  };

  if (hideBox) return null;

  return (
    <div className="flex flex-col items-end ml-4" dir="rtl">
      <button
        onClick={handleSendRequest}
        className="btn-success"
      >
        שלח בקשת חברות
      </button>
    </div>
  );
};

export default FriendAddRequest;

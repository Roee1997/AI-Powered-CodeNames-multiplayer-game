import React from "react";
import { set, ref } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { useNavigate } from "react-router-dom";

const GameInvitationToast = ({ userId, invitation, closeToast }) => {
  const navigate = useNavigate();
  const sender = invitation?.fromName || "שחקן אלמוני";

  const clearInvitation = () => {
    set(ref(db, `invitations/${userId}`), null);
  };

  const handleAccept = () => {
    clearInvitation();
    closeToast();
    navigate(`/game-lobby/${invitation.gameId}`);
  };

  const handleReject = () => {
    clearInvitation();
    closeToast();
  };

  return (
    <div className="text-right">
      <div className="mb-2 font-bold">{sender} הזמין אותך למשחק!</div>
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={handleAccept}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          הצטרף
        </button>
        <button
          onClick={handleReject}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          דחה
        </button>
      </div>
    </div>
  );
};

export default GameInvitationToast;

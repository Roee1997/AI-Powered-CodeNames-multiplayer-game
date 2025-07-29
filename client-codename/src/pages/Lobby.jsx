import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BackgroundImage from "../components/UI/BackgroundImage";
import MainHeadLine from "../components/UI/MainHeadLine";
import Header from "../components/UI/Header";
import Footer from "../components/UI/Footer";
import codenamesImage from '../assets/codename.png';
import { setUserOnlineStatus } from "../services/firebaseService";
import { toast } from "react-toastify";
import JoinGameForm from "../components/UI/JoinGameForm";
import API_BASE from "../config/api";

const Lobby = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gameIdInput, setGameIdInput] = useState("");

  useEffect(() => {
    if (user?.uid) {
      setUserOnlineStatus(user.uid, false, null);
    }
  }, [user]);

  const showToast = (message, type = "info") => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else if (type === "warn") toast.warn(message);
    else toast.info(message);
  };

  if (!user) {
    return <p>יש להתחבר כדי לגשת לדף זה.</p>;
  }

  const handleCreateGame = async () => {
    try {
      const gamePayload = {
        CreatedBy: user.uid,
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
        throw new Error(errorData.error || "שגיאה לא ידועה");
      }
      
      const data = await response.json();

      // שליחת isCreator דרך navigate במקום localStorage
      navigate(`/game-lobby/${data.gameID}`, { state: { isCreator: true } });

      // Show different message based on whether it's a new game or existing waiting game
      if (data.IsExistingGame) {
        showToast("🎮 נכנס למשחק הממתין שלך!", "info");
      } else {
        showToast("🎮 המשחק נוצר בהצלחה!", "success");
      }
    } catch (error) {
      showToast("⚠️ שגיאה ביצירת המשחק. נסה שוב מאוחר יותר.", "error");
    }
  };

  const handleJoinGame = async () => {
    if (!gameIdInput) {
      showToast("יש להזין קוד משחק", "error");
      return;
    }

    if (!user?.uid) {
      showToast("לא נמצא משתמש מחובר", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/games/is-joinable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: parseInt(gameIdInput),
          userId: user.uid,
        }),
      });

      const data = await res.json();

      if (!data.joinable) {
        showToast("המשחק לא קיים, התחיל, או שאינך חלק ממנו.", "error");
        return;
      }

      navigate(`/game-lobby/${gameIdInput}`);
    } catch {
      showToast("שגיאה בבדיקת המשחק. נסה שוב.", "error");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <BackgroundImage image={codenamesImage} />

      <div className="relative z-10 flex flex-col items-center justify-center flex-grow py-6 max-ml:py-4 space-y-4 max-ml:space-y-3">
        <MainHeadLine />

        <button
          onClick={handleCreateGame}
          className="px-4 max-ml:px-3 py-2 max-ml:py-1.5 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition text-base max-ml:text-sm"
        >
          התחל משחק חדש
        </button>

        <JoinGameForm
          gameIdInput={gameIdInput}
          setGameIdInput={setGameIdInput}
          onJoin={handleJoinGame}
        />
      </div>

      <Footer className="mt-auto" />
    </div>
  );
};

export default Lobby;

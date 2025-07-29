import { get, onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { endTurnFromClient } from "../../services/turnService";

const TurnTimer = ({ gameId, currentTurn, winner }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [turnDuration, setTurnDuration] = useState(120);
  const intervalRef = useRef(null);
  const alertedRef = useRef(false);
  const { user } = useAuth();
  const turnIdAtStartRef = useRef(null); // 🆕 נזהה האם התור השתנה
  const endAttemptedRef = useRef(false); // 🆕 למניעת כפילויות

  useEffect(() => {
    if (!gameId || !currentTurn || winner) return;

    const turnDurationRef = ref(db, `games/${gameId}/settings/turnDuration`);
    onValue(turnDurationRef, (snapshot) => {
      const duration = snapshot.val();
      if (duration) setTurnDuration(duration);
    });

    const turnStartRef = ref(db, `games/${gameId}/turnStart`);
    const unsubscribe = onValue(turnStartRef, async (snapshot) => {
      const startTime = snapshot.val();
      if (!startTime) return;

      // נשמור את ה-TurnID של תחילת הטיימר
      const turnIdSnap = await get(ref(db, `games/${gameId}/currentTurnId`));
      turnIdAtStartRef.current = turnIdSnap.val();
      endAttemptedRef.current = false;

      const updateTime = async () => {
        const now = Date.now();
        const secondsElapsed = Math.floor((now - startTime) / 1000);
        const remaining = turnDuration - secondsElapsed;
        setTimeLeft(Math.max(0, remaining));

        if (remaining <= 10 && !alertedRef.current) {
          toast.warn("⏰ עוד 10 שניות לסיום התור!", { position: "top-center", autoClose: 5000 });
          alertedRef.current = true;
        }

        // ✅ בודק אם כבר עבר תור
        const latestTurnIdSnap = await get(ref(db, `games/${gameId}/currentTurnId`));
        const latestTurnId = latestTurnIdSnap.val();

        if (turnIdAtStartRef.current !== latestTurnId) {
          clearInterval(intervalRef.current);
          console.log("✅ התור כבר השתנה – הטיימר לא יסיים שוב");
          return;
        }

        // 🧠 הזמן נגמר – נסיים תור רק פעם אחת
        if (remaining <= 0 && !endAttemptedRef.current) {
          clearInterval(intervalRef.current);
          endAttemptedRef.current = true;
          await endTurnFromClient(gameId, currentTurn, user.uid);
          toast.info("🔁 הזמן נגמר – התור עבר אוטומטית", { position: "top-center", autoClose: 4000 });
        }
      };

      updateTime();
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(updateTime, 1000);
    });

    return () => {
      unsubscribe();
      clearInterval(intervalRef.current);
      alertedRef.current = false;
      turnIdAtStartRef.current = null;
      endAttemptedRef.current = false;
    };
  }, [gameId, currentTurn, winner, turnDuration]);

  const getTimeColorClass = () => {
    if (timeLeft <= 10) return "bg-red-100 text-red-800 border border-red-400 animate-pulse";
    if (timeLeft <= 30) return "bg-yellow-100 text-yellow-800 border border-yellow-300";
    return "bg-white text-gray-800 border border-gray-300";
  };

  return (
    <div className="w-full flex flex-col items-center gap-2 mt-2">
      <div className="w-full bg-gray-300 h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-1000"
          style={{
            width: `${(timeLeft / turnDuration) * 100}%`,
            backgroundColor:
              timeLeft <= 10 ? "#dc2626" :
              timeLeft <= 30 ? "#facc15" :
              "#6b7280"
          }}
        ></div>
      </div>
      <div className={`text-sm font-semibold px-3 py-1 rounded shadow-sm font-mono ${getTimeColorClass()} transition-colors duration-500`}>
        ⏱️ {timeLeft} שניות
      </div>
    </div>
  );
};

export default TurnTimer;

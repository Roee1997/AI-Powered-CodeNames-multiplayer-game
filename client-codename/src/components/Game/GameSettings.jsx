import React, { useState, useEffect } from "react";
import { ref, set, onValue } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { Clock, Info, Target, Brain, Play } from "lucide-react";
import { motion } from "framer-motion";

const GameSettings = ({ gameId, isOwner, isCreator, onStartGame }) => {
  const [turnDuration, setTurnDuration] = useState(120);
  const [gameType, setGameType] = useState("classic");
  const [showTooltip, setShowTooltip] = useState("");

  useEffect(() => {
    const settingsRef = ref(db, `games/${gameId}/settings`);
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        if (val.turnDuration) setTurnDuration(val.turnDuration);
        if (val.gameType) setGameType(val.gameType);
      }
    });
    return () => unsubscribe();
  }, [gameId]);

  const updateSettings = async (newSettings) => {
    const settingsRef = ref(db, `games/${gameId}/settings`);
    await set(settingsRef, {
      turnDuration,
      gameType,
      ...newSettings,
    });
  };

  const handleDurationChange = (e) => {
    const value = Number(e.target.value);
    setTurnDuration(value);
    updateSettings({ turnDuration: value });
  };

  const handleGameTypeChange = (e) => {
    const value = e.target.value;
    setGameType(value);
    updateSettings({ gameType: value });
  };

  const Tooltip = ({ id, content }) => (
    <div
      className={`absolute z-10 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-xl transition-opacity duration-200 ${
        showTooltip === id ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ width: "200px", transform: "translateY(-120%)" }}
    >
      {content}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 md:p-6 rounded-2xl text-white shadow-xl w-full max-w-md mx-auto border border-gray-600 relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500 opacity-10 rounded-full blur-2xl"></div>
      
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 md:gap-3 mb-4 md:mb-6 relative">
        <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-300" />
        הגדרות משחק
      </h2>

      {/* משך תור */}
      <div className="relative mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="turnDuration" className="text-sm md:text-base font-semibold text-gray-200">
            🕐 משך תור
          </label>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onMouseEnter={() => setShowTooltip("duration")}
            onMouseLeave={() => setShowTooltip("")}
          >
            <Info className="w-4 h-4" />
          </button>
          <Tooltip
            id="duration"
            content="הגדר את משך הזמן המקסימלי לכל תור. זמן קצר יותר = משחק מאתגר יותר!"
          />
        </div>
        <select
          id="turnDuration"
          className="w-full rounded-lg px-3 md:px-4 py-2 md:py-3 bg-gray-700 text-white border border-gray-600 hover:border-yellow-500 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 font-medium text-sm md:text-base"
          value={turnDuration}
          onChange={handleDurationChange}
          disabled={!isOwner}
        >
          <option value={30}>⚡️ 30 שניות - מהיר במיוחד</option>
          <option value={60}>🏃 דקה - קצב מהיר</option>
          <option value={90}>⏱️ דקה וחצי - מאוזן</option>
          <option value={120}>🤔 2 דקות - נינוח</option>
          <option value={180}>🧘 3 דקות - ללא לחץ</option>
        </select>
      </div>

      {/* סוג משחק */}
      <div className="relative mb-4">
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="gameType" className="text-sm md:text-base font-semibold text-gray-200">
            🎮 סוג משחק
          </label>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onMouseEnter={() => setShowTooltip("gameType")}
            onMouseLeave={() => setShowTooltip("")}
          >
            <Info className="w-4 h-4" />
          </button>
          <Tooltip
            id="gameType"
            content="מצב מדעי מתקדם הכולל: ניתוח מילים בזמן אמת עם ציון איכות (0-100%), גרפים אינטראקטיביים עם דמיון מתמטי, פידבק חכם על כל ניחוש, אזהרות על קשרים מסוכנים, והיסטוריית ניתוחים מלאה של כל התורות."
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <button
            className={`flex flex-col items-center gap-1 md:gap-2 p-3 md:p-4 rounded-lg border transition-all ${
              gameType === "classic"
                ? "bg-yellow-500 border-yellow-400 text-gray-900"
                : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500"
            }`}
            onClick={() => handleGameTypeChange({ target: { value: "classic" } })}
            disabled={!isOwner}
          >
            <Target className={`w-5 h-5 md:w-6 md:h-6 ${gameType === "classic" ? "text-gray-900" : "text-gray-400"}`} />
            <span className="font-medium text-sm md:text-base">רגיל</span>
            <span className="text-xs opacity-75">עברית</span>
          </button>
          <button
            className={`flex flex-col items-center gap-1 md:gap-2 p-3 md:p-4 rounded-lg border transition-all ${
              gameType === "scientific"
                ? "bg-yellow-500 border-yellow-400 text-gray-900"
                : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500"
            }`}
            onClick={() => handleGameTypeChange({ target: { value: "scientific" } })}
            disabled={!isOwner}
          >
            <Brain className={`w-5 h-5 md:w-6 md:h-6 ${gameType === "scientific" ? "text-gray-900" : "text-gray-400"}`} />
            <span className="font-medium text-sm md:text-base">מדעי</span>
            <span className="text-xs opacity-75">ניתוח מתקדם</span>
          </button>
        </div>
      </div>

      {!isOwner && (
        <div className="mt-6 p-3 bg-gray-900 rounded-lg text-sm text-gray-400 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <p>רק יוצר החדר יכול לשנות את ההגדרות</p>
        </div>
      )}

      {/* Start Game Button */}
      {isCreator && onStartGame && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartGame}
          className="w-full mt-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg lg:text-xl font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 hover:shadow-emerald-500/20 hover:shadow-2xl transition-all duration-200"
        >
          <Play className="w-5 h-5 lg:w-6 lg:h-6" />
          התחל משחק
        </motion.button>
      )}
    </div>
  );
};

export default GameSettings;

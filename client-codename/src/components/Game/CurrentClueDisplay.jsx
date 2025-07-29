import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db } from "../../../firebaseConfig";

const CurrentClueDisplay = ({ gameId, turnId, currentTurn }) => {
  const [currentClue, setCurrentClue] = useState(null);
  const [guessCount, setGuessCount] = useState(0);
  const [isNewClue, setIsNewClue] = useState(false);

  useEffect(() => {
    if (!gameId || !turnId) return;

    const clueRef = ref(db, `games/${gameId}/lastClues/${turnId}`);
    const unsubClue = onValue(clueRef, (snap) => {
      const clue = snap.val();
      if (clue && (!currentClue || clue.timestamp !== currentClue.timestamp)) {
        setIsNewClue(true);
        setTimeout(() => setIsNewClue(false), 2000);
      }
      setCurrentClue(clue);
      if (clue) {
        setGuessCount(0);
      }
    });

    // מעקב אחר ניחושים
    const guessesRef = ref(db, `games/${gameId}/guesses`);
    const unsubGuesses = onValue(guessesRef, (snap) => {
      if (snap.exists()) {
        const guesses = Object.values(snap.val());
        const currentTurnGuesses = guesses.filter(g => 
          g?.type === "guess" && 
          g?.timestamp >= (currentClue?.timestamp || 0)
        );
        setGuessCount(currentTurnGuesses.length);
      }
    });

    return () => {
      unsubClue();
      unsubGuesses();
    };
  }, [gameId, turnId, currentClue?.timestamp]);

  if (!currentClue || !currentTurn) return null;

  const isRedTeam = currentClue.team === "Red";
  const remainingGuesses = Math.max(0, currentClue.number - guessCount);
  const isGuessesExhausted = remainingGuesses === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      key={currentClue?.timestamp}
    >
      <div className={`bg-gradient-to-r ${
        isRedTeam 
          ? "from-red-500/85 to-red-600/85" 
          : "from-blue-500/85 to-blue-600/85"
      } rounded-xl sm:rounded-2xl px-3 py-2 sm:px-6 sm:py-4 shadow-lg border border-white/15 backdrop-blur-sm flex flex-col items-center max-w-[280px] sm:max-w-[340px] mx-auto ${isNewClue ? "clue-glow" : ""}`}
        style={{fontSize: "1rem sm:1.5rem"}}
      >
        <div className="flex items-center gap-2 sm:gap-3 mb-1">
          <span className="text-lg sm:text-2xl">{isRedTeam ? "🔴" : "🔵"}</span>
          <span className="font-bold text-white text-lg sm:text-2xl" style={{letterSpacing: "0.5px"}}>{currentClue.word}</span>
          <span className="text-white/90 text-sm sm:text-lg">({currentClue.number})</span>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90">
          <span>ניחושים: {guessCount}/{currentClue.number}</span>
          {isGuessesExhausted && <span className="text-yellow-300 font-bold">🔒</span>}
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">לוחש: {currentClue.giverName}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default CurrentClueDisplay; 
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { toast } from "react-toastify";
import { 
  initiateRematch, 
  voteForRematch, 
  subscribeToRematchStatus, 
  checkRematchStatus,
  createRematchGame,
  hasUserVoted 
} from "../../services/rematchService";
import AnalysisPanel from "../Analytics/AnalysisPanel";

const GameOverScreen = React.memo(({ winner, stats, gameId, allPlayers, gameCreator, gameMode }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  // rematch states
  const [rematchStatus, setRematchStatus] = useState(null);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  
  // analysis state for scientific mode
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    // אנימציית כניסה מדורגת
    const timer1 = setTimeout(() => setShowContent(true), 300);
    const timer2 = setTimeout(() => setShowStats(true), 1000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // האזנה לסטטוס משחק חוזר
  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = subscribeToRematchStatus(gameId, (data) => {
      setRematchStatus(data);
      
      // בדיקה אם המשחק אושר על ידי כולם - רק היוצר יוצר את החדר החדש
      if (data && data.status === 'voting' && user?.uid === gameCreator) {
        checkRematchStatus(gameId, allPlayers || []).then(status => {
          if (status.status === 'approved') {
            handleCreateRematchGame();
          }
        });
      }
    });

    // בדיקה אם המשתמש כבר הצביע
    if (user?.uid) {
      hasUserVoted(gameId, user.uid).then(setUserHasVoted);
    }

    return unsubscribe;
  }, [gameId, user?.uid, allPlayers, gameCreator]);

  // האזנה להודעות על יצירת משחק חדש (לשחקנים שאינם היוצר)
  useEffect(() => {
    if (!gameId || user?.uid === gameCreator) return;

    const notificationRef = ref(db, `rematchNotifications/${gameId}`);
    const unsubscribeNotification = onValue(notificationRef, (snapshot) => {
      const notification = snapshot.val();
      if (notification && notification.newGameId) {
        toast.success("משחק חוזר נוצר! מעביר אותך לחדר החדש...");
        setTimeout(() => {
          navigate(`/game-lobby/${notification.newGameId}`);
        }, 2000);
      }
    });

    return unsubscribeNotification;
  }, [gameId, user?.uid, gameCreator, navigate]);

  const handleInitiateRematch = async () => {
    if (!user?.uid || !gameId) return;
    
    const success = await initiateRematch(gameId, user.uid, user.displayName || user.email);
    if (success) {
      setUserHasVoted(true);
    }
  };

  const handleVoteRematch = async (vote) => {
    if (!user?.uid || !gameId) return;
    
    const success = await voteForRematch(gameId, user.uid, user.displayName || user.email, vote);
    if (success) {
      setUserHasVoted(true);
    }
  };

  const handleCreateRematchGame = async () => {
    if (!gameId || !allPlayers || !user?.uid || isCreatingGame) return;
    
    setIsCreatingGame(true);
    const newGameId = await createRematchGame(gameId, allPlayers, user.uid);
    
    if (newGameId) {
      setTimeout(() => {
        navigate(`/game-lobby/${newGameId}`);
      }, 2000);
    } else {
      setIsCreatingGame(false);
    }
  };

  const getThemeConfig = () => {
    const isVictory = winner === "Red" || winner === "Blue";
    const teamColor = winner.includes("Red") ? "red" : winner.includes("Blue") ? "blue" : "gray";
    
    if (isVictory) {
      return {
        bgGradient: teamColor === "red" 
          ? "from-red-600 via-red-500 to-orange-500" 
          : "from-blue-600 via-blue-500 to-purple-500",
        titleColor: "text-white",
        icon: "🏆",
        confetti: true
      };
    } else {
      return {
        bgGradient: "from-gray-800 via-gray-700 to-gray-900",
        titleColor: "text-red-300",
        icon: "💀",
        confetti: false
      };
    }
  };

  const getMessage = () => {
    const config = getThemeConfig();
    switch (winner) {
      case "Red": return `${config.icon} הקבוצה האדומה ניצחה!`;
      case "Blue": return `${config.icon} הקבוצה הכחולה ניצחה!`;
      case "RedLost": return `${config.icon} הקבוצה האדומה הפסידה – נלחץ מתנקש!`;
      case "BlueLost": return `${config.icon} הקבוצה הכחולה הפסידה – נלחץ מתנקש!`;
      default: return `${config.icon} המשחק הסתיים`;
    }
  };

  const themeConfig = getThemeConfig();


  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${themeConfig.bgGradient} flex flex-col items-center justify-center z-50 p-6 overflow-hidden`}>
      {/* אפקטי רקע */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      {/* קונפטי לניצחון */}
      {themeConfig.confetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-white opacity-70 animate-bounce`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* תוכן ראשי */}
      <div className="relative z-10 text-center space-y-8 max-w-4xl mx-auto">
        {/* כותרת עם אנימציה */}
        <div className={`transform transition-all duration-1000 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          <h1 className={`text-4xl md:text-6xl font-bold ${themeConfig.titleColor} drop-shadow-lg mb-4 animate-pulse`}>
            {getMessage()}
          </h1>
          <div className="w-32 h-1 bg-white mx-auto rounded-full opacity-60"></div>
        </div>

        {/* סטטיסטיקות משופרות */}
        {stats && showStats && (
          <div className={`transform transition-all duration-1000 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-2xl font-bold text-white mb-6">📊 סטטיסטיקות המשחק</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* כרטיס קבוצה אדומה */}
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-8 h-8 bg-red-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-bold text-white">קבוצה אדומה</h3>
                </div>
                <p className="text-3xl font-bold text-white">{stats.redCorrectGuesses}</p>
                <p className="text-sm text-gray-200">ניחושים נכונים</p>
              </div>

              {/* כרטיס קבוצה כחולה */}
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-8 h-8 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="text-xl font-bold text-white">קבוצה כחולה</h3>
                </div>
                <p className="text-3xl font-bold text-white">{stats.blueCorrectGuesses}</p>
                <p className="text-sm text-gray-200">ניחושים נכונים</p>
              </div>

              {/* כרטיס שחקן מצטיין */}
              <div className="bg-yellow-500 bg-opacity-30 backdrop-blur-sm rounded-xl p-6 border border-yellow-400 border-opacity-50">
                <div className="flex items-center justify-center mb-4">
                  <span className="text-2xl mr-2">🏆</span>
                  <h3 className="text-xl font-bold text-white">שחקן מצטיין</h3>
                </div>
                <p className="text-lg font-bold text-yellow-100">{stats.bestPlayer || "לא זמין"}</p>
              </div>

              {/* כרטיס זמן ממוצע */}
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-30">
                <div className="flex items-center justify-center mb-4">
                  <span className="text-2xl mr-2">⏱️</span>
                  <h3 className="text-xl font-bold text-white">זמן ממוצע</h3>
                </div>
                <p className="text-2xl font-bold text-white">
                  {stats.avgTurnTimeSeconds?.toFixed(1) || "לא זמין"}
                </p>
                <p className="text-sm text-gray-200">שניות לתור</p>
              </div>
            </div>
          </div>
        )}

        {/* מצב הצבעה על משחק חוזר */}
        {rematchStatus && rematchStatus.status === 'voting' && (
          <div className="bg-blue-500 bg-opacity-30 backdrop-blur-sm rounded-xl p-6 border border-blue-400 border-opacity-50 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">🗳️ הצבעה על משחק חוזר</h3>
            <p className="text-blue-100 mb-4">
              {rematchStatus.initiatorName} מבקש משחק חוזר. 
              {rematchStatus.votedPlayers}/{rematchStatus.totalPlayers} שחקנים הצביעו
            </p>
            
            {!userHasVoted ? (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleVoteRematch(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  ✅ בעד
                </button>
                <button
                  onClick={() => handleVoteRematch(false)}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  ❌ נגד
                </button>
              </div>
            ) : (
              <p className="text-center text-green-200 font-semibold">✅ הצבעת כבר! ממתין לשאר השחקנים...</p>
            )}

            {/* רשימת הצבעות */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.values(rematchStatus.votes || {}).map((vote, index) => (
                <div key={index} className={`flex items-center gap-2 ${vote.vote ? 'text-green-200' : 'text-red-200'}`}>
                  <span>{vote.vote ? '✅' : '❌'}</span>
                  <span>{vote.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* מסך יצירת משחק חדש */}
        {isCreatingGame && (
          <div className="bg-green-500 bg-opacity-30 backdrop-blur-sm rounded-xl p-6 border border-green-400 border-opacity-50 mb-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-white mb-2">🎮 יוצר משחק חדש...</h3>
              <p className="text-green-100">מעביר ללובי החדש עם כל השחקנים</p>
            </div>
          </div>
        )}

        {/* כפתורים */}
        <div className={`flex flex-col sm:flex-row gap-4 justify-center transform transition-all duration-1000 delay-500 ${showStats ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <button
            onClick={() => navigate("/lobby")}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm border border-white border-opacity-30 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            חזור ללובי
          </button>
          
          {!rematchStatus && !isCreatingGame && user?.uid === gameCreator && (
            <button
              onClick={handleInitiateRematch}
              disabled={!gameId || !allPlayers}
              className="bg-green-500 bg-opacity-80 hover:bg-opacity-100 disabled:bg-gray-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              משחק חוזר
            </button>
          )}
          
          {gameMode === "scientific" && (
            <button
              onClick={() => setShowAnalysis(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>📊</span>
              ניתוח מדעי
            </button>
          )}
        </div>
      </div>
      
      {/* ניתוח מדעי בפופאפ */}
      {showAnalysis && gameMode === "scientific" && (
        <AnalysisPanel
          gameId={gameId}
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </div>
  );
});

GameOverScreen.displayName = 'GameOverScreen';

export default GameOverScreen;

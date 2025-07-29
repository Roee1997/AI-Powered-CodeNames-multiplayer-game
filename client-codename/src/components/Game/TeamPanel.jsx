import React, { useEffect, useState } from "react";
import TurnTime from "./TurnTimer";
import { motion } from "framer-motion";
import { Shield, User, Crown, Wifi, WifiOff, Clock } from "lucide-react";
import { subscribeToGamePresence } from "../../services/firebaseService";

const TeamPanel = ({ teamColor, players, userId, currentTurn, winner, gameId, onPlayerDisconnection }) => {
  const isRed = teamColor === "Red";
  const baseColor = isRed ? "red" : "blue";
  const teamName = isRed ? "קבוצה אדומה" : "קבוצה כחולה";
  const teamEmoji = isRed ? "🔴" : "🔵";
  const teamPlayers = players.filter((p) => p.team === teamColor);
  const spymaster = teamPlayers.find(p => p.isSpymaster);
  const operatives = teamPlayers.filter(p => !p.isSpymaster);
  
  const [gamePresence, setGamePresence] = useState({});

  // Subscribe to real-time presence data
  useEffect(() => {
    if (!gameId) return;
    
    const unsubscribe = subscribeToGamePresence(gameId, (presenceData) => {
      setGamePresence(presenceData);
    });
    
    return () => unsubscribe();
  }, [gameId]);

  // Get connection status for a player
  const getPlayerConnectionStatus = (playerId) => {
    const presence = gamePresence[playerId];
    if (!presence) return { status: 'unknown', icon: Wifi, color: 'text-gray-400' };
    
    switch (presence.connectionStatus) {
      case 'connected':
        return { status: 'מחובר', icon: Wifi, color: 'text-green-400' };
      case 'timeout':
        return { status: 'זמן פג', icon: Clock, color: 'text-yellow-400' };
      case 'disconnected':
        return { status: 'מנותק', icon: WifiOff, color: 'text-red-400' };
      default:
        return { status: 'לא ידוע', icon: Wifi, color: 'text-gray-400' };
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const playerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      transition={{ duration: 0.5 }}
      className={`rounded-3xl shadow-2xl p-6 ${
        isRed 
          ? "bg-gradient-to-br from-red-500 via-red-600 to-red-700" 
          : "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700"
      } w-80 max-ml:w-72 relative overflow-hidden border border-white/20`}
    >
      {/* Decorative Background Elements */}
      <div className={`absolute top-0 right-0 w-40 h-40 ${
        isRed ? "bg-red-400" : "bg-blue-400"
      } opacity-20 rounded-full blur-3xl animate-pulse`}></div>
      
      <div className={`absolute bottom-0 left-0 w-32 h-32 ${
        isRed ? "bg-red-300" : "bg-blue-300"
      } opacity-15 rounded-full blur-2xl`}></div>
      
      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl max-ml:text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {teamName}
            <span className="text-2xl max-ml:text-xl">{teamEmoji}</span>
          </h2>
        </div>
        
        <div className="flex items-center justify-between text-sm text-white/80 mb-4">
          <span>שחקנים: {teamPlayers.length}</span>
          {currentTurn === teamColor && !winner && (
            <div className="flex items-center gap-1">
              <Crown className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 font-medium">תור שלנו!</span>
            </div>
          )}
        </div>

        {/* Turn Timer */}
        {currentTurn === teamColor && !winner && (
          <div className="mb-4">
            <TurnTime gameId={gameId} currentTurn={currentTurn} winner={winner} />
          </div>
        )}
      </div>

      {/* Players List */}
      <div className="space-y-4">
        {/* Spymaster Section */}
        {spymaster && (
          <motion.div
            variants={playerVariants}
            className={`p-3 rounded-xl ${
              isRed ? "bg-red-700/50" : "bg-blue-700/50"
            } backdrop-blur-sm border border-white/10`}
          >
            <div className="text-xs text-white/70 mb-2 flex items-center gap-1">
              <Crown className="w-4 h-4" />
              לוחש
            </div>
            <div className={`flex items-center gap-2 p-2 rounded-lg ${
              isRed ? "bg-red-900/50" : "bg-blue-900/50"
            }`}>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  <span>{spymaster.username || "שחקן"}</span>
                  {spymaster.userID === userId && (
                    <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                      אתה
                    </span>
                  )}
                </div>
                {!spymaster.isAI && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {(() => {
                        const { icon: Icon, color } = getPlayerConnectionStatus(spymaster.userID);
                        return <Icon className={`w-3 h-3 ${color}`} />;
                      })()}
                      <span className={`text-xs ${getPlayerConnectionStatus(spymaster.userID).color}`}>
                        {getPlayerConnectionStatus(spymaster.userID).status}
                      </span>
                    </div>
                    {getPlayerConnectionStatus(spymaster.userID).status === 'מנותק' && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                        מחליף ב-AI...
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Operatives Section */}
        <div className="space-y-2">
          <div className="text-xs text-white/70 flex items-center gap-1 mb-2">
            <User className="w-4 h-4" />
            סוכנים
          </div>
          {operatives.map((player, index) => (
            <motion.div
              key={player.userID}
              variants={playerVariants}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                isRed ? "bg-red-900/50" : "bg-blue-900/50"
              } hover:bg-white/5 transition-colors`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white flex items-center gap-2">
                  <span>{player.username || "שחקן"}</span>
                  {player.userID === userId && (
                    <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                      אתה
                    </span>
                  )}
                </div>
                {!player.isAI && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      {(() => {
                        const { icon: Icon, color } = getPlayerConnectionStatus(player.userID);
                        return <Icon className={`w-3 h-3 ${color}`} />;
                      })()}
                      <span className={`text-xs ${getPlayerConnectionStatus(player.userID).color}`}>
                        {getPlayerConnectionStatus(player.userID).status}
                      </span>
                    </div>
                    {getPlayerConnectionStatus(player.userID).status === 'מנותק' && (
                      <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                        מחליף ב-AI...
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TeamPanel;

import { motion } from "framer-motion";
import React, { useEffect } from "react";
import assassinImg from "../../assets/assasin.jpg";
import blueTeamImg from "../../assets/blueteam.jpeg";
import neutralImg from "../../assets/neutral.jpeg";
import redTeamImg from "../../assets/redteam.jpeg";
import "../../css/Card.css";
import { useSound } from "../../hooks/useSound";

const Card = ({ card, gameId, canClick, onCardRevealed, currentTurn, userTeam, isSpymaster }) => {
  const { word, team, isRevealed } = card;
  const sound = useSound();

  // Play reveal sound when card is revealed
  useEffect(() => {
    if (isRevealed) {
      sound.cardReveal(team);
    }
  }, [isRevealed, team]); // הסרנו את sound מה-dependencies

  const handleClick = () => {
    if (!canClick || isRevealed) return;
    if (userTeam !== currentTurn || isSpymaster) return;
    
    // Play click sound (this will also stop any hover sounds)
    sound.cardClick(team);
    
    if (onCardRevealed) onCardRevealed(card);
  };

  const handleMouseEnter = () => {
    // Only play hover sound for clickable cards - and only if not too many sounds playing
    if (canClick && !isRevealed && userTeam === currentTurn && !isSpymaster) {
      // Hover sounds are very quiet and limited
      sound.cardHover();
    }
  };

  const getCardImage = () => {
    switch (team) {
      case "Red": return redTeamImg;
      case "Blue": return blueTeamImg;
      case "Neutral": return neutralImg;
      case "Assassin": return assassinImg;
      default: return "";
    }
  };

  const getTeamColor = (team) => {
    switch (team) {
      case "Red": return "#f27463";
      case "Blue": return "#68b0f0";
      case "Neutral": return "#d6c7a1";
      case "Assassin": return "#000";
      default: return "transparent";
    }
  };

  const cardStyle = isRevealed
    ? {
        backgroundImage: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.1)), url(${getCardImage()})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        filter: "contrast(1.1) saturate(1.2)", // הבהרת התמונה
      }
    : {
        backgroundImage: `url('/cgroup81/test2/tar5/card-bg3.png')`,
        backgroundSize: "cover", 
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };

  return (
    <motion.div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: isRevealed ? 180 : 0 }}
      transition={{ duration: 0.6 }}
      className="card-wrapper w-full h-full"
    >
      <div
        className={`card relative flex items-center justify-center rounded-xl max-ml:rounded-lg overflow-hidden shadow-lg
          ${!isRevealed && canClick && userTeam === currentTurn && !isSpymaster 
            ? "cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:-translate-y-1" 
            : ""
          }
          ${isRevealed ? "opacity-95 ring-2 max-ml:ring-1 ring-white/20" : ""}
        `}
        style={cardStyle}
      >
        {/* אייקון ברור בפינה ללוחש */}
        {!isRevealed && isSpymaster && (
          <div
            className="absolute top-2 right-2 max-ml:top-1.5 max-ml:right-1.5 w-8 h-8 max-ml:w-7 max-ml:h-7 rounded-full flex items-center justify-center pointer-events-none shadow-lg"
            style={{
              backgroundColor: team === "Assassin" ? "#000" : getTeamColor(team),
              border: "2px solid white",
              boxShadow: team === "Assassin" ? "0 0 10px rgba(255,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.3)"
            }}
          >
            <span className="text-white font-bold text-lg max-ml:text-base">
              {team === "Red" ? "🔴" : team === "Blue" ? "🔵" : team === "Neutral" ? "⚪" : "☠️"}
            </span>
          </div>
        )}

        {/* מילה במרכז קלף - משופרת */}
        {!isRevealed && (
          <div
            className="absolute bottom-[15%] max-ml:bottom-[18%] w-full text-center font-bold text-[17px] max-ml:text-[16px] pointer-events-none"
            style={{ 
              color: "#1a1a1a",
              textShadow: "0 1px 3px rgba(255,255,255,0.9), 0 2px 6px rgba(255,255,255,0.6)",
              letterSpacing: "0.8px",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            }}
          >
            {word}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Card;

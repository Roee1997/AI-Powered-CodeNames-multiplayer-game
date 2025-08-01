/**
 * Game Component - דף המשחק הראשי והמרכזי של אפליקציית Codenames
 * 
 * אחראי על:
 * - ניהול כל מצבי המשחק ותיאום בין כל הרכיבים
 * - סנכרון בזמן אמת עם Firebase לכל היבטי המשחק
 * - ניהול חיבור מחדש אוטומטי והחלפת AI ↔ שחקנים אמיתיים
 * - מערכת presence ו-heartbeat לזיהוי ניתוק שחקנים
 * - אינטגרציה מלאה עם מערכת הבינה המלאכותית
 * - ניתוח embedding מתקדם במצב המדעי
 * - ניהול צלילים ואפקטים ויזואליים
 * - מעקב אחר סטטיסטיקות ואנליטיקה
 * 
 * תכונות מתקדמות:
 * - מערכת היכרות מחדש חכמה שמזהה ניתוקים ומאפשרת חזרה
 * - ניהול AI אוטומטי שמחליף שחקנים שנותקו ומחזיר אותם בחזרה
 * - אנליטיקה בזמן אמת עם ניתוח דמיון סמנטי של מילים
 * - מערכת צלילים מתקדמת עם בקרת מצב משחק
 * - תמיכה בשני מצבי משחק: קלאסי ומדעי
 * - ניהול שגיאות מקיף עם התאוששות אוטומטית
 */

import { onValue, ref, get, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { db } from "../../firebaseConfig";
import codenamesImage from "../assets/codename.png";
import BackgroundImage from "../components/UI/BackgroundImage";
import Board from "../components/Game/Board";
import ClueChat from "../components/Game/ClueChat";
import CluePanel from "../components/Game/CluePanel";
import TeamPanel from "../components/Game/TeamPanel";
import API_BASE from "../config/api";
import { useAuth } from "../context/AuthContext";
import GameOverScreen from "../components/Game/GameOverScreen";
import { runAIClueGenerator, runAIGuess } from "../services/aiService";
import { playGameEndSoundOptimized, resetGameEndState } from "../services/soundService";
import {
  setGameEnded,
  setUserOnlineStatus,
  setGamePresence,
  sendActivityHeartbeat,
  subscribeToBoard,
  subscribeToClues,
  subscribeToGameEnded,
  subscribeToLobbyPlayers,
  subscribeToTurn,
  subscribeToWinner,
  subscribeToGameEvents,
  subscribeToGamePresence,
  checkReconnectionOpportunity,
  restorePlayerFromAI
} from "../services/firebaseService";
import { endTurnFromClient } from "../services/turnService";
import AnalysisPanel from "../components/Analytics/AnalysisPanel";
import CurrentClueDisplay from "../components/Game/CurrentClueDisplay";
import { sendEmbeddingAnalysis } from "../services/useEmbeddingAnalysis";
import { useGameSounds } from "../hooks/useSound";
import RulesModal from "../components/UI/RulesModal";
import { BookOpen } from "lucide-react";

/**
 * רכיב המשחק הראשי - מרכז הקואורדינציה של כל המשחק
 * מנהל את כל ההיבטים של המשחק כולל מצב, שחקנים, AI, צלילים וניתוח
 */
const Game = () => {
  // Router וניהול ניווט
  const { gameId } = useParams();              // מזהה המשחק מה-URL
  const { user, loading } = useAuth();         // נתוני המשתמש המחובר
  const navigate = useNavigate();              // לניווט בין דפים

  // State מרכזי של המשחק
  const [turnId, setTurnId] = useState(null);                    // מזהה התור הנוכחי
  const [isSpymaster, setIsSpymaster] = useState(false);         // האם המשתמש הוא מרגל
  const [team, setTeam] = useState(null);                        // הצוות של המשתמש (Red/Blue)
  const [clues, setClues] = useState([]);                        // היסטוריית רמזים
  const [currentTurn, setCurrentTurn] = useState(null);          // הצוות שתורו כרגע
  const [winner, setWinner] = useState(null);                    // הצוות המנצח
  const [players, setPlayers] = useState([]);                    // רשימת כל השחקנים
  const [boardCards, setBoardCards] = useState([]);              // כל קלפי הלוח
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false); // מצב חלונית החוקים

  // נתונים נגזרים
  const boardWords = boardCards.map(card => card.word);          // רק המילים מהקלפים

  // Refs למניעת פעולות כפולות ומעקב מצב
  const guessedCardHandledRef = useRef(false);      // מונע טיפול כפול בניחושים
  const aiClueGivenRef = useRef(false);             // מונע מתן רמזי AI כפולים
  const lastTurnIdRef = useRef(null);               // מעקב אחר ID התור הקודם
  const lastTurnTeamRef = useRef(null);             // מעקב אחר הצוות של התור הקודם
  const gameEndSoundPlayedRef = useRef(false);      // מגן מפני השמעת צליל סיום כפול
  const gameEndApiCalledRef = useRef(false);        // מגן מפני קריאות API כפולות לסיום

  // מצבי UI ותכונות מתקדמות
  const [gameMode, setGameMode] = useState(null);                // מצב המשחק (classic/scientific)
  const [showAnalysis, setShowAnalysis] = useState(false);       // הצגת פאנל האנליטיקה
  const [isEndingTurn, setIsEndingTurn] = useState(false);       // מצב של סיום תור
  const [currentTurnGuessCount, setCurrentTurnGuessCount] = useState(0); // מספר ניחושים בתור
  const [currentClue, setCurrentClue] = useState(null);          // הרמז הנוכחי

  // מערכת צלילים מתקדמת עם מעקב מצב משחק
  const gameSound = useGameSounds({ 
    gameState: winner ? 'finished' : 'playing', 
    userTeam: team, 
    currentTurn 
  });
  
  /**
   * Effect לניתוח embedding של התור הקודם במצב המדעי
   * מפעיל ניתוח דמיון סמנטי בין רמזים לניחושים שבוצעו
   * רק במצב scientific ורק כאשר יש מידע נדרש מלא
   */
  useEffect(() => {
    // בדיקת תנאים נדרשים לניתוח
    if (
      !gameId ||
      !turnId ||
      !lastClue ||
      !lastClue.word ||
      !lastClue.team ||
      !lastClue.timestamp ||
      gameMode !== "scientific"
    ) return;
  
    /**
     * פונקציה פנימית לביצוע ניתוח embedding של התור הקודם
     * אוספת את כל הניחושים שבוצעו אחרי הרמז ושולחת לניתוח
     */
    const analyzePreviousTurn = async () => {
      try {
        // שליפת כל הניחושים מ-Firebase
        const guessesSnap = await get(ref(db, `games/${gameId}/guesses`));
        let guesses = [];
        
        if (guessesSnap.exists()) {
          const allGuesses = Object.values(guessesSnap.val());
          // סינון הניחושים שקשורים לרמז הנוכחי (לפי timestamp)
          guesses = allGuesses
            .filter(g => g?.type === "guess" && g?.word && g?.timestamp)
            .filter(g => g.timestamp >= lastClue.timestamp)
            .map(g => g.word);
        }
  
        // שליחת הנתונים לניתוח embedding
        await sendEmbeddingAnalysis({
          gameId,
          turnId: lastTurnIdRef.current, // התור הקודם
          clue: lastClue.word,
          team: lastClue.team,
          guesses,
          allWords: boardWords
        });
  
        console.log("📊 ניתוח embedding נשלח עבור התור הקודם");
  
      } catch (err) {
        console.error("❌ שגיאה בניתוח embedding:", err);
      }
    };
  
    analyzePreviousTurn();
  }, [turnId]);

  /**
   * Effect לאתחול המשחק וטעינת הגדרות בסיסיות
   * מאפס צלילי סיום ומגדיר מעקב אחר סוג המשחק
   */
  useEffect(() => {
    if (!gameId) return;
    
    // איפוס מצב צלילי הסיום למשחק חדש - למניעת צלילים משחקים קודמים
    resetGameEndState();
    
    // מעקב אחר סוג המשחק (classic/scientific) מ-Firebase
    const modeRef = ref(db, `games/${gameId}/settings/gameType`);
    return onValue(modeRef, (snapshot) => {
      setGameMode(snapshot.val());
    });
  }, [gameId]);

  /**
   * Effect לניהול מזהה התור הנוכחי
   * מעדכן את המצב המקומי ושומר עותק ב-ref למעקב
   */
  useEffect(() => {
    if (!gameId) return;
    
    const turnIdRef = ref(db, `games/${gameId}/currentTurnId`);
    return onValue(turnIdRef, (snapshot) => {
      const newTurnId = snapshot.val();
      setTurnId(newTurnId);
      lastTurnIdRef.current = newTurnId; // שמירה ב-ref למעקב חיצוני
    });
  }, [gameId]);

  /**
   * Effect לזיהוי יוצר המשחק מנתוני השחקנים
   * משמש להרשאות מיוחדות כמו ניהול המשחק
   */
  useEffect(() => {
    if (!players || players.length === 0) return;
    
    const creator = players.find(player => player.isCreator === true);
    if (creator) {
      setGameCreator(creator.userID);
    }
  }, [players, user?.uid]);

  // דגל למניעת בדיקות חיבור מחדש מרובות
  const [hasCheckedReconnection, setHasCheckedReconnection] = useState(false);

  /**
   * Effect למערכת חיבור מחדש חכמה - אחת המתכונות המתקדמות ביותר
   * זוהה שחקן שהתנתק ומזהה אם יש לו אפשרות להתחבר מחדש
   * מטפל גם בהחלפת AI חזרה לשחקן אמיתי אם נדרש
   * 
   * תהליך הפעולה:
   * 1. בדיקה האם השחקן היה במשחק קודם לכן
   * 2. הצגת הודעה למשתמש עם אפשרות להתחבר מחדש
   * 3. שחזור נתוני השחקן (צוות, תפקיד)
   * 4. הסרת AI שהחליף אותו (אם היה)
   * 5. הודעת הצלחה למשתמש
   */
  useEffect(() => {
    if (!gameId || !user?.uid || hasCheckedReconnection) return;
    
    const checkReconnection = async () => {
      try {
        // בדיקה עם שירות Firebase אם יש אפשרות חיבור מחדש
        const reconnectionData = await checkReconnectionOpportunity(user.uid, gameId);
        
        if (reconnectionData.canReconnect) {
          // הצגת הודעה למשתמש עם אפשרות בחירה
          const shouldReconnect = window.confirm(reconnectionData.message);
          
          if (shouldReconnect && reconnectionData.playerData) {
            // שחזור נתוני השחקן המקוריים
            setTeam(reconnectionData.playerData.team);
            setIsSpymaster(reconnectionData.playerData.isSpymaster);
            
            // טיפול בהחלפת AI חזרה לשחקן אמיתי
            if (reconnectionData.needsAIReplacement) {
              // זיהוי השחקן AI שהחליף את המשתמש
              const aiPlayerId = `ai-${reconnectionData.playerData.team.toLowerCase()}-${reconnectionData.playerData.isSpymaster ? 'spymaster' : 'operative'}`;
              await restorePlayerFromAI(gameId, user.uid, aiPlayerId);
              toast.success('התחברת מחדש ו-AI הוסר בהצלחה!');
            } else {
              toast.success('התחברת מחדש למשחק!');
            }
          }
        }
      } catch (error) {
        console.error('Error during reconnection check:', error);
      } finally {
        // וידוא שהבדיקה תתבצע רק פעם אחת
        setHasCheckedReconnection(true);
      }
    };

    checkReconnection();
  }, [gameId, user?.uid, hasCheckedReconnection]);

  // Set up presence and heartbeat
  useEffect(() => {
    if (!gameId || !user?.uid || !hasCheckedReconnection) return;
    
    // Set basic online status
    setUserOnlineStatus(user.uid, true, gameId);
    
    // Set detailed game presence
    setGamePresence(user.uid, gameId, true, false);
    
    // Start heartbeat system
    const heartbeatInterval = setInterval(() => {
      sendActivityHeartbeat(user.uid, gameId, 'heartbeat');
    }, 10000); // Every 10 seconds
    
    // נחפש את נתוני השחקן גם בלובי וגם במשחק
    const playerLobbyRef = ref(db, `lobbies/${gameId}/players/${user.uid}`);
    const playerGameRef = ref(db, `games/${gameId}/players/${user.uid}`);
    
    const unsubscribePlayerLobby = onValue(playerLobbyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTeam(data.team);
        setIsSpymaster(data.isSpymaster);
        
        // 🎯 SPYMASTER ROLE DETECTION LOGGING
        if (data.isSpymaster && data.team) {
          console.log(`\n🎯 ========== SPYMASTER ROLE DETECTED ==========`);
          console.log(`👤 Player: ${user.displayName} (${user.uid})`);
          console.log(`🎮 Game: ${gameId}`);
          console.log(`🏆 Role: ${data.team.toUpperCase()} SPYMASTER`);
          console.log(`⏰ Current Turn: ${currentTurn || 'Not Started'}`);
          console.log(`✅ Spymaster payload logging ACTIVE for this game`);
          console.log(`============================================\n`);
        }
        
        // Update presence with current turn status
        const isCurrentTurn = data.team === currentTurn;
        setGamePresence(user.uid, gameId, true, isCurrentTurn);
        
        // Also send heartbeat to update activity
        sendActivityHeartbeat(user.uid, gameId, 'player_data_updated');
      }
    });
    
    const unsubscribePlayerGame = onValue(playerGameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTeam(data.team);
        setIsSpymaster(data.isSpymaster);
        
        // 🎯 SPYMASTER ROLE DETECTION LOGGING (Game Data)
        if (data.isSpymaster && data.team) {
          console.log(`\n🎯 ========== SPYMASTER ROLE CONFIRMED (Game Data) ==========`);
          console.log(`👤 Player: ${user.displayName} (${user.uid})`);
          console.log(`🎮 Game: ${gameId}`);
          console.log(`🏆 Role: ${data.team.toUpperCase()} SPYMASTER`);
          console.log(`⏰ Current Turn: ${currentTurn || 'Not Started'}`);
          console.log(`✅ Spymaster logging confirmed from game data`);
          console.log(`=======================================================\n`);
        }
        
        // Update presence with current turn status
        const isCurrentTurn = data.team === currentTurn;
        setGamePresence(user.uid, gameId, true, isCurrentTurn);
        
        // Also send heartbeat to update activity
        sendActivityHeartbeat(user.uid, gameId, 'player_data_updated');
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribePlayerLobby();
      unsubscribePlayerGame();
    };
  }, [gameId, user?.uid, currentTurn, hasCheckedReconnection, players]);
  const [stats, setStats] = useState(null);
  const [gameEvents, setGameEvents] = useState({});
  const [gameCreator, setGameCreator] = useState(null);
  
  // Automatic AI replacement function using exact GameLobby pattern
  const replacePlayerWithAI = async (disconnectedPlayer) => {
    try {
      // Generate AI player data (EXACT same as GameLobby handleAddAI)
      const aiId = `ai-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const aiName = `AI ${disconnectedPlayer.team === "Red" ? "אדום" : "כחול"} ${disconnectedPlayer.isSpymaster ? "לוחש" : "סוכן"} #${Math.floor(Math.random() * 10000)}`;

      const aiPlayer = {
        userID: aiId,
        username: aiName,
        team: disconnectedPlayer.team,
        isSpymaster: disconnectedPlayer.isSpymaster
      };

      // Step 1: Add AI to SQL using exact same API call as GameLobby
      const response = await fetch(`${API_BASE}/api/playeringames/${gameId}/add-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: parseInt(gameId),
          userID: aiPlayer.userID,
          username: aiPlayer.username,
          team: aiPlayer.team,
          isSpymaster: aiPlayer.isSpymaster
        })
      });

      const resultText = await response.text();

      if (!response.ok) {
        console.error(`❌ AI replacement failed - Server error:`, resultText);
        return { success: false };
      }

      // Step 2: Remove disconnected player from Firebase (both locations)
      await set(ref(db, `lobbies/${gameId}/players/${disconnectedPlayer.userID}`), null);
      await set(ref(db, `games/${gameId}/players/${disconnectedPlayer.userID}`), null);

      // Step 3: Add AI to Firebase (both locations to ensure Game.jsx sees the change)
      const aiPlayerData = {
        ...aiPlayer,
        isAI: true,
        replacedHumanId: disconnectedPlayer.userID // Track which human this AI replaced
      };
      await set(ref(db, `lobbies/${gameId}/players/${aiId}`), aiPlayerData);
      await set(ref(db, `games/${gameId}/players/${aiId}`), aiPlayerData);

      return { success: true, aiId };

    } catch (error) {
      console.error(`❌ Error replacing player with AI:`, error);
      return { success: false };
    }
  };

  // Replace AI with returning human player
  const replaceAIWithHumanPlayer = async (humanUserId, aiId, originalUsername) => {
    try {
      // Find the AI player in the current players list
      const aiPlayer = players.find(p => p.userID === aiId);
      if (!aiPlayer) {
        console.error(`❌ AI player ${aiId} not found`);
        return false;
      }

      // Use the stored original username
      const humanPlayerData = {
        userID: humanUserId,
        username: originalUsername || "שחקן", // Use the original username that was stored
        team: aiPlayer.team,
        isSpymaster: aiPlayer.isSpymaster,
        isAI: false
      };


      // Step 1: Remove AI from SQL
      const removeResponse = await fetch(`${API_BASE}/api/playeringames/${gameId}/remove-ai`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiId)
      });

      if (!removeResponse.ok) {
        const errorText = await removeResponse.text();
        console.error(`❌ Failed to remove AI from server:`, errorText);
      }

      // Step 2: Add human player back to SQL
      const addResponse = await fetch(`${API_BASE}/api/playeringames/${gameId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: parseInt(gameId),
          userID: humanPlayerData.userID,
          username: humanPlayerData.username,
          team: humanPlayerData.team,
          isSpymaster: humanPlayerData.isSpymaster
        })
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        console.error(`❌ Failed to add human player to server:`, errorText);
      }

      // Step 3: Remove AI from Firebase (both locations)
      await set(ref(db, `lobbies/${gameId}/players/${aiId}`), null);
      await set(ref(db, `games/${gameId}/players/${aiId}`), null);

      // Step 4: Add human player back to Firebase (both locations)
      await set(ref(db, `lobbies/${gameId}/players/${humanUserId}`), humanPlayerData);
      await set(ref(db, `games/${gameId}/players/${humanUserId}`), humanPlayerData);

      return true;

    } catch (error) {
      console.error(`❌ Error replacing AI with human player:`, error);
      return false;
    }
  };

  // Track processed disconnections to prevent duplicates
  const [processedDisconnections, setProcessedDisconnections] = useState(new Set());
  
  // Track which AI replaced which human player for reconnection
  const [aiReplacements, setAiReplacements] = useState(new Map()); // userID -> {aiID, originalUsername}
  
  // Track reconnections being processed to prevent loops
  const [processedReconnections, setProcessedReconnections] = useState(new Set());

  // Direct presence change detection for immediate AI replacement
  useEffect(() => {
    if (!gameId || !user?.uid || !hasCheckedReconnection || !players.length) return;

    let lastProcessTime = 0;
    const RATE_LIMIT = 2000; // Process changes only every 2 seconds

    // Subscribe to game presence changes using existing Firebase service
    const unsubscribePresence = subscribeToGamePresence(gameId, async (presenceData) => {
      if (!presenceData) return;
      
      const now = Date.now();
      if (now - lastProcessTime < RATE_LIMIT) return; // Rate limiting
      lastProcessTime = now;

      // Check each player's presence status
      for (const [userId, presence] of Object.entries(presenceData)) {
        // Skip AI players
        if (userId.startsWith('ai-')) continue;

        // Check if player is disconnected and needs AI replacement
        if (presence.connectionStatus === 'disconnected' && !processedDisconnections.has(userId)) {
          // Find the player in our players list
          const disconnectedPlayer = players.find(p => p.userID === userId);
          
          if (disconnectedPlayer && !disconnectedPlayer.isAI) {
            // Mark as processing immediately to prevent duplicates
            setProcessedDisconnections(prev => new Set([...prev, userId]));
            
            // Replace with AI immediately
            const result = await replacePlayerWithAI(disconnectedPlayer);
            
            if (result.success) {
              // Track the AI replacement for reconnection (store both AI ID and original username)
              setAiReplacements(prev => new Map(prev.set(userId, {
                aiId: result.aiId,
                originalUsername: disconnectedPlayer.username
              })));
              toast.info(`${disconnectedPlayer.username} נותק - הוחלף ב-AI`);
            } else {
              // If failed, remove from processed set to allow retry
              setProcessedDisconnections(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
              });
            }
          }
        }
        
        // Check if a previously disconnected player has reconnected
        else if (presence.connectionStatus === 'connected' && 
                 processedDisconnections.has(userId) && 
                 !processedReconnections.has(userId)) {
          
          // Check if this user has an AI replacement
          const replacementData = aiReplacements.get(userId);
          
          if (replacementData) {
            // Mark as being processed immediately to prevent loops
            setProcessedReconnections(prev => new Set([...prev, userId]));
            
            // Replace AI with returning human player using stored original username
            const success = await replaceAIWithHumanPlayer(userId, replacementData.aiId, replacementData.originalUsername);
            
            if (success) {
              // Clean up ALL tracking
              setProcessedDisconnections(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
              });
              setAiReplacements(prev => {
                const newMap = new Map(prev);
                newMap.delete(userId);
                return newMap;
              });
              setProcessedReconnections(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
              });
              
              toast.success(`${replacementData.originalUsername || 'שחקן'} חזר למשחק - AI הוסר`);
            } else {
              // If failed, remove from processed reconnections to allow retry
              setProcessedReconnections(prev => {
                const newSet = new Set(prev);
                newSet.delete(userId);
                return newSet;
              });
            }
          }
        }
      }
    });

    return () => {
      unsubscribePresence();
    };
  }, [gameId, user?.uid, hasCheckedReconnection, players, processedDisconnections, aiReplacements, processedReconnections]);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("שגיאה בשליפת סטטיסטיקה:", err);
    }
  };

  if (winner) fetchStats();
}, [winner]);

  useEffect(() => {
    if (!gameId) return;
    const unsubClues = subscribeToClues(gameId, setClues);
    const unsubTurn = subscribeToTurn(gameId, (currentTurnTeam) => {
      if (lastTurnTeamRef.current !== currentTurnTeam) {
        lastTurnTeamRef.current = currentTurnTeam;
        setCurrentTurn(currentTurnTeam);
        aiClueGivenRef.current = false; // 🧹 איפוס נעילה

        // Update current turn status for this player
        if (user?.uid && team) {
          const isMyTurn = team === currentTurnTeam;
          setGamePresence(user.uid, gameId, true, isMyTurn);
          sendActivityHeartbeat(user.uid, gameId, 'turn_changed');
        }

        // AI trigger removed - handled by consolidated useEffect below to prevent double triggers
      }
    });

    // נטען את השחקנים מהמיקום החדש במשחק תחילה
    const unsubPlayersGame = onValue(ref(db, `games/${gameId}/players`), (snapshot) => {
      const gameData = snapshot.val();
      if (gameData) {
        const playersArray = Object.values(gameData);
        setPlayers(playersArray);
      }
    });
    
    // נטען מהלובי כגיבוי רק אם אין נתונים במשחק
    const unsubPlayersLobby = subscribeToLobbyPlayers(gameId, (lobbyPlayers) => {
      setPlayers(prevPlayers => {
        // רק אם אין שחקנים כרגע, נשתמש בשחקנים מהלובי
        if (prevPlayers.length === 0) {
          return lobbyPlayers;
        }
        return prevPlayers;
      });
    });
    // Removed automatic lobby navigation - let users manually navigate via GameOverScreen
    // const unsubEnded = subscribeToGameEnded(gameId, (ended) => ended && navigate("/lobby"));
    const unsubWinner = subscribeToWinner(gameId, async (winValue) => {
      setWinner(winValue);
      if (winValue && !gameEndSoundPlayedRef.current) {
        // הגנה מפני צליל חוזר - נגן רק פעם אחת
        gameEndSoundPlayedRef.current = true;
        
        // Play victory or defeat sound based on user's team
        const isVictory = winValue === team;
        playGameEndSoundOptimized(isVictory);
        
        // API calls מאופטמים - עם הגנה מפני קריאות חוזרות
        const performOptimizedGameEnd = async () => {
          if (gameEndApiCalledRef.current) {
            return;
          }
          
          gameEndApiCalledRef.current = true;
          
          try {
            // עדכן סטטוס משחק
            await fetch(`${API_BASE}/api/games/${gameId}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify("Finished")
            });
            
            // קבע מנצח
            const winningTeam =
              winValue === "Red" || winValue === "Blue"
                ? winValue
                : winValue === "RedLost"
                  ? "Blue"
                  : "Red";
            await fetch(`${API_BASE}/api/games/${gameId}/winner`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(winningTeam)
            });
            
            // סיום המשחק
            await setGameEnded(gameId);
            
          } catch (err) {
            console.error("❌ שגיאה בסיום משחק:", err);
            // במקרה של שגיאה, אפשר ניסיון חוזר
            gameEndApiCalledRef.current = false;
          }
        };
        
        // התחל את התהליך אחרי 20 שניות
        setTimeout(performOptimizedGameEnd, 20000);
      }
    });

    return () => {
      unsubClues();
      unsubTurn();
      unsubPlayersGame();
      unsubPlayersLobby();
      // unsubEnded(); // Removed since automatic navigation is disabled
      unsubWinner();
    };
  }, [gameId, players, user?.uid, team]);

  useEffect(() => {
    if (!gameId) return;
    const unsubscribe = subscribeToBoard(gameId, (cards) => {
      setBoardCards(cards);
    });
    return () => unsubscribe();
  }, [gameId]);

  const [lastClue, setLastClue] = useState(null);

  useEffect(() => {
    if (!gameId || !turnId) return;
    const clueRef = ref(db, `games/${gameId}/lastClues/${turnId}`);
    return onValue(clueRef, async (snapshot) => {
      const clue = snapshot.val();
      setLastClue(clue);

      if (!clue || winner) return;

      const aiGuesser = players.find(
        (p) => p.isAI && !p.isSpymaster && p.team === clue.team
      );

      if (aiGuesser) {
        // Add 200ms delay for proper chronological order in game log
        await new Promise((resolve) => setTimeout(resolve, 200));
        
        // Double-check AI guesser still exists after delay
        const confirmedAiGuesser = players.find(
          (p) => p.isAI && !p.isSpymaster && p.team === clue.team
        );
        if (confirmedAiGuesser) {
          await runAIGuess(gameId, clue.team);
        }
      }
    });
  }, [gameId, players, winner, turnId]);

  useEffect(() => {
    if (!gameId || !players.length) return;
    const guessedCardRef = ref(db, `games/${gameId}/guessedCard`);
    return onValue(guessedCardRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data || guessedCardHandledRef.current) return;
      guessedCardHandledRef.current = true;

      const matchingCard = boardCards.find((c) => c.word === data.word && !c.isRevealed);
      if (!matchingCard) return;

      const board = document.getElementById("board-card-click-sim");
      board?.dispatchEvent(new CustomEvent("ai-guess", {
        detail: {
          ...matchingCard,
          user: {
            uid: `ai-${data.team.toLowerCase()}-guesser`,
            displayName: "AI"
          }
        }
      }));

      setTimeout(() => {
        guessedCardHandledRef.current = false;
      }, 500);
    });
  }, [gameId, players, boardCards]);

  // מעקב אחר ניחושים בתור הנוכחי
  useEffect(() => {
    if (!gameId || !turnId) return;

    // מעקב אחר הרמז הנוכחי
    const clueRef = ref(db, `games/${gameId}/lastClues/${turnId}`);
    const unsubClue = onValue(clueRef, (snap) => {
      const clue = snap.val();
      setCurrentClue(clue);
      if (clue) {
        setCurrentTurnGuessCount(0); // איפוס מונה ניחושים כשיש רמז חדש
      }
    });

    // מעקב אחר ניחושים
    const guessesRef = ref(db, `games/${gameId}/guesses`);
    const unsubGuesses = onValue(guessesRef, (snap) => {
      if (snap.exists() && currentClue) {
        const guesses = Object.values(snap.val());
        const currentTurnGuesses = guesses.filter(g => 
          g?.type === "guess" && 
          g?.timestamp >= (currentClue?.timestamp || 0)
        );
        setCurrentTurnGuessCount(currentTurnGuesses.length);
      }
    });

    return () => {
      unsubClue();
      unsubGuesses();
    };
  }, [gameId, turnId, currentClue?.timestamp]);

  // Removed duplicate AI clue reset - handled in turn subscription callback to prevent race conditions

  // ✅ הפעלת AI כשכל התנאים מוכנים (כולל תור ראשון)
  useEffect(() => {
    if (!currentTurn || !turnId || winner) return;
    
    const aiSpymaster = players.find(
      (p) => p.isAI && p.isSpymaster && p.team === currentTurn
    );

    // בדיקה נוספת: וודא שאין רמז קיים לתור הנוכחי
    const hasCurrentClue = currentClue && currentClue.turnId === turnId;

    if (aiSpymaster && !aiClueGivenRef.current && !hasCurrentClue) {
      // Add 200ms delay to ensure turn transition is complete and proper chronological order
      setTimeout(() => {
        // בדיקה כפולה: וודא שעדיין אין רמז ו-AI לא נתן רמז
        const stillNoClue = !currentClue || currentClue.turnId !== turnId;
        if (!aiClueGivenRef.current && stillNoClue) {
          aiClueGivenRef.current = true;
          runAIClueGenerator(gameId, currentTurn);
        }
      }, 200);
    }
  }, [currentTurn, turnId, winner, currentClue]);

  if (loading) return <p className="text-center text-white mt-20">⏳ טוען משתמש...</p>;
  if (!user) return <p className="text-center text-red-500 mt-20">😞 אין גישה</p>;

 
  return (
    <div className="min-h-screen flex flex-col game-container">
      <BackgroundImage image={codenamesImage} />
      <main className="flex-1 px-2 sm:px-4 py-1 sm:py-4 text-white overflow-x-auto" dir="rtl">
        <section className="flex flex-col max-ml:flex-row xl:flex-row gap-3 sm:gap-6 max-ml:gap-8 lg:gap-10 justify-center items-start px-2 sm:px-4 max-ml:px-6 lg:px-8 max-w-[1800px] mx-auto min-w-fit">
          <div className="w-full max-ml:w-[18rem] xl:w-[20rem] flex flex-col gap-3 sm:gap-6">
            <TeamPanel 
              teamColor="Blue" 
              players={players} 
              userId={user.uid} 
              currentTurn={currentTurn} 
              winner={winner} 
              gameId={gameId} 
            />
            <ClueChat clues={clues} gameId={gameId} />
            
            {/* כפתור להצגת ניתוח גרפי - מתחת לצ'אט הרמזים */}
            {gameMode === "scientific" && !winner && turnId && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAnalysis(true)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base"
                >
                  <span>📊</span>
                  <span className="hidden sm:inline">ניתוח גרפי</span>
                  <span className="sm:hidden">ניתוח</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 flex justify-center min-w-0">
            <div className="w-full max-w-[1200px] text-center px-1 sm:px-4">
              <div className="text-center mb-2 sm:mb-6">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-6 border border-white/20 space-y-2 sm:space-y-4">
                  
                  {/* Row 1: Room Title + Rules Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    <h1 className="text-xl sm:text-3xl font-bold text-white">
                      🎯 חדר #{gameId}
                    </h1>
                    <button
                      onClick={() => setIsRulesModalOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-xs sm:text-sm shadow-lg"
                      title="הצג חוקי משחק"
                    >
                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">חוקי המשחק</span>
                      <span className="sm:hidden">חוקים</span>
                    </button>
                  </div>

                  {/* Row 2: Current Team Turn Indicator */}
                  {currentTurn && (
                    <div className={`w-full max-w-[400px] mx-auto rounded-xl sm:rounded-2xl px-3 py-2 sm:px-6 sm:py-3 flex items-center justify-center gap-2 sm:gap-3 shadow-lg text-white text-sm sm:text-xl font-bold tracking-wide
                      ${currentTurn === "Red" ? "bg-gradient-to-r from-red-500 to-red-700" : "bg-gradient-to-r from-blue-500 to-blue-700"}
                    `}>
                      <span className="text-lg sm:text-2xl">{currentTurn === "Red" ? "🔴" : "🔵"}</span>
                      <span className="text-center">
                        <span className="hidden sm:inline">עכשיו בתור: </span>
                        {currentTurn === "Red" ? "הקבוצה האדומה" : "הקבוצה הכחולה"}
                      </span>
                    </div>
                  )}

                  {/* Row 3: Current Clue + Action Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    {/* Fixed height container to prevent board jumping */}
                    <div className="min-h-[60px] sm:min-h-[88px] flex items-center justify-center">
                      <CurrentClueDisplay 
                        gameId={gameId} 
                        turnId={turnId} 
                        currentTurn={currentTurn} 
                      />
                    </div>
                    
                    {/* Finish Guessing Button - ליד הרמז */}
                    {currentTurn === team && !isSpymaster && !winner && (
                      <div className="text-center">
                        {isEndingTurn ? (
                          <div className="px-4 py-2 bg-gray-200 text-gray-600 font-bold rounded-lg flex items-center gap-2 text-sm">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                            <span>ממתין לסיום התור...</span>
                          </div>
                        ) : !currentClue || currentTurnGuessCount === 0 ? (
                          <div className="px-3 py-2 bg-red-100 text-red-600 font-medium rounded-lg border border-red-300 cursor-not-allowed text-center text-sm">
                            <div className="flex items-center gap-1">
                              <span>🚫</span>
                              <span>{!currentClue ? "ממתין לרמז" : "נחש קודם"}</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={async () => {
                              setIsEndingTurn(true);
                              try {
                                await endTurnFromClient(gameId, currentTurn, user.uid);
                                toast.info("🔁 התור הסתיים ועבר לקבוצה השנייה");
                              } finally {
                                setIsEndingTurn(false);
                              }
                            }}
                            className="max-w-[280px] sm:max-w-[340px] mx-auto px-3 py-2 sm:px-6 sm:py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl sm:rounded-2xl hover:from-yellow-500 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                          >
                            <div className="flex items-center gap-1">
                              <span>✋</span>
                              <span>סיים ({currentTurnGuessCount})</span>
                            </div>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Wait for your turn message */}
                    {currentTurn !== team && !isSpymaster && !winner && (
                      <div className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-medium rounded-lg text-center text-sm">
                        ⏳ המתן לתורך
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>


              {/* לוח המשחק */}
              <Board gameId={gameId} user={user} team={team} isSpymaster={isSpymaster} currentTurn={currentTurn} winner={winner} turnId={turnId} />


              {/* פאנל הלוחש – מתחת ללוח */}
              {isSpymaster && team && (
                <div style={{margin: '8px auto', maxWidth: '600px'}}>
                  <CluePanel
                    gameId={gameId}
                    team={team}
                    currentTurn={currentTurn}
                    boardWords={boardWords}
                    boardCards={boardCards}
                    userId={user.uid}
                    turnId={turnId}
                  />
                </div>
              )}


              {winner && (
                <GameOverScreen 
                  winner={winner} 
                  stats={stats} 
                  gameId={gameId}
                  allPlayers={players}
                  gameCreator={gameCreator}
                  gameMode={gameMode}
                />
              )}
            </div>
          </div>
          <div className="w-full max-ml:w-[18rem] xl:w-[20rem]">
            <TeamPanel 
              teamColor="Red" 
              players={players} 
              userId={user.uid} 
              currentTurn={currentTurn} 
              winner={winner} 
              gameId={gameId} 
            />
          </div>
        </section>
      </main>

      {/* ניתוח גרפי (פופאפ) */}
      {/* כפתור להצגת ניתוח גרפי - קבוע בצד */}
      {showAnalysis && (
        <AnalysisPanel
          gameId={gameId}
          turnId={turnId}
          onClose={() => setShowAnalysis(false)}
        />
      )}

      {/* Rules Modal */}
      <RulesModal 
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
};

export default Game;

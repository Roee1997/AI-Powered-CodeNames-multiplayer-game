import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { onValue, ref, set, get } from "firebase/database";
import { db } from "../../firebaseConfig";
import { useAuth } from "../context/AuthContext";
import {
  saveBoardToFirebase,
  savePlayerToLobby,
  setTurn,
  subscribeToLobbyPlayers
} from "../services/firebaseService";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { Play, User, Crown, Users, BookOpen } from "lucide-react";

import Header from "../components/UI/Header";
import Footer from "../components/UI/Footer";
import BackgroundImage from "../components/UI/BackgroundImage";
import codenamesImage from "../assets/codename.png";
import OnlineFriendsList from "../components/FriendsComps/OnlineFriendsList";
import API_BASE from "../config/api";
import GameSettings from "../components/Game/GameSettings";
import TeamSection from "../components/Game/TeamSection";
import RulesModal from "../components/UI/RulesModal";

// Removed automatic cleanup system to prevent delays

const GameLobby = () => {
  const { gameId } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("Red");
  const [selectedRole, setSelectedRole] = useState("operative");
  const [isCreator, setIsCreator] = useState(location.state?.isCreator || false);
  const [aiPrompts, setAiPrompts] = useState({
    red: "",
    blue: ""
  });
  const [aiProfiles, setAiProfiles] = useState({
    red: "custom",
    blue: "custom"
  });
  const [savedPrompts, setSavedPrompts] = useState({
    red: false,
    blue: false
  });
  const [isAddingAI, setIsAddingAI] = useState(false);
  const [aiOperationTimeout, setAiOperationTimeout] = useState(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isManualLeaving, setIsManualLeaving] = useState(false);
  const playersRef = useRef(players);
  
  // Update ref whenever players state changes
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  
  // Helper function to retry operations with exponential backoff
  const retryOperation = async (operation, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: wait 1s, then 2s, then 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Clean function to remove player from role when leaving (browser close, page change, etc.)
  const removePlayerFromRole = async () => {
    // Early exits - no cleanup needed
    if (!user?.uid || !gameId || isManualLeaving) {
      return;
    }
    
    try {
      // נבדוק אם המשחק התחיל
      const statusSnapshot = await get(ref(db, `lobbies/${gameId}/status`));
      const status = statusSnapshot.val();
      
      // אם המשחק התחיל, לא נמחק את השחקן
      if (status === "started") {
        return;
      }
    } catch (error) {
      // אם יש שגיאה בבדיקת הסטטוס, נמשיך עם הניקוי
    }
    
    // Use ref to get current player state without triggering re-renders
    const currentPlayer = playersRef.current.find(p => p.userID === user.uid);
    if (!currentPlayer?.team) {
      return;
    }
    
    // Use the same reliable kick mechanism as manual leaving
    // This ensures consistency and prevents double deletion issues
    try {
      if (navigator.sendBeacon) {
        // For browser close: Use sendBeacon with kick endpoint
        const formData = new FormData();
        formData.append('creatorUserID', user.uid);
        formData.append('targetUserID', user.uid);
        
        navigator.sendBeacon(`${API_BASE}/api/playeringames/${gameId}/kick`, formData);
      } else {
        // Fallback: synchronous request using kick endpoint
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `${API_BASE}/api/playeringames/${gameId}/kick`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
          creatorUserID: user.uid,
          targetUserID: user.uid
        }));
      }
      
      // Remove from Firebase silently (no await, no error handling)
      set(ref(db, `lobbies/${gameId}/players/${user.uid}`), null).catch(() => {});
    } catch (error) {
      // Ignore all errors during cleanup - this is best effort
    }
  };
  
  // Enhanced setIsAddingAI with timeout protection
  const setIsAddingAIWithTimeout = (value) => {
    if (aiOperationTimeout) {
      clearTimeout(aiOperationTimeout);
      setAiOperationTimeout(null);
    }
    
    setIsAddingAI(value);
    
    if (value) {
      // Set a timeout to automatically reset the state after 15 seconds
      const timeoutId = setTimeout(() => {
        setIsAddingAI(false);
        setAiOperationTimeout(null);
      }, 15000);
      setAiOperationTimeout(timeoutId);
    }
  };

  useEffect(() => {
    const unsubscribePlayers = subscribeToLobbyPlayers(gameId, async (playersData) => {
      setPlayers(playersData);

      // בדיקה אם השחקן הנוכחי הוא יוצר על פי הנתונים שקיימים (למשחק חוזר)
      const currentPlayer = playersData.find(p => p.userID === user.uid);
      if (currentPlayer?.isCreator === true && !isCreator) {
        setIsCreator(true);
      }

      const isInLobby = playersData.some(p => p.userID === user.uid);

      if (location.state?.isCreator && user?.uid && !isInLobby) {
        try {
          await savePlayerToLobby(gameId, {
            userID: user.uid,
            username: user.displayName || "ללא שם",
            team: null,
            isSpymaster: false,
            isCreator: true
          });
          setIsCreator(true);
        } catch (err) {
          // Error creating room creator silently
        }
      }
    });

    const statusRef = ref(db, `lobbies/${gameId}/status`);
    const unsubscribeStatus = onValue(statusRef, async (snapshot) => {
      const status = snapshot.val();
      if (status === "started") {
        try {
          // נקבל את נתוני השחקנים הנוכחיים מהלובי
          const lobbyPlayersSnapshot = await get(ref(db, `lobbies/${gameId}/players`));
          const lobbyPlayers = lobbyPlayersSnapshot.val();
          
          if (lobbyPlayers) {
            // שמירת כל השחקנים לעמוד המשחק
            for (const [playerId, player] of Object.entries(lobbyPlayers)) {
              await set(ref(db, `games/${gameId}/players/${playerId}`), {
                ...player
              });
            }
          }
        } catch (err) {
          console.error("שגיאה בשמירת נתוני השחקנים:", err);
        }
        
        toast.success("המשחק התחיל! מעביר ללוח המשחק");
        navigate(`/game/${gameId}`);
      }
    });

    return () => {
      unsubscribePlayers();
      unsubscribeStatus();
    };
  }, [gameId, user]);

  // Simple player leave detection
  useEffect(() => {
    if (!user?.uid || !gameId) return;

    // 1. Handle tab closing and navigation
    const handleBeforeUnload = () => {
      removePlayerFromRole();
    };

    // Add modern event listener (unload is deprecated)
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 2. Handle page visibility changes (better than unload)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        removePlayerFromRole();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Handle page change in game (component unmount)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Remove player when leaving GameLobby component
      removePlayerFromRole();
    };
  }, [user?.uid, gameId]); // FIXED: Removed players dependency to prevent state change triggers

  // טוען ושומר פרומפטים ופרופילים של AI מפיירבייס
  useEffect(() => {
    const promptsRef = ref(db, `games/${gameId}/aiPrompts`);
    const profilesRef = ref(db, `games/${gameId}/aiProfiles`);
    
    const unsubscribePrompts = onValue(promptsRef, (snapshot) => {
      const prompts = snapshot.val();
      if (prompts) {
        setAiPrompts(prompts);
        // Mark as saved when loaded from Firebase
        setSavedPrompts({
          red: !!prompts.red,
          blue: !!prompts.blue
        });
      }
    });

    const unsubscribeProfiles = onValue(profilesRef, (snapshot) => {
      const profiles = snapshot.val();
      if (profiles) {
        setAiProfiles(profiles);
      }
    });
    
    return () => {
      unsubscribePrompts();
      unsubscribeProfiles();
    };
  }, [gameId]);

  // Save AI profile selection
  const saveAiProfile = async (team, profileId) => {
    try {
      const profilesRef = ref(db, `games/${gameId}/aiProfiles`);
      const updatedProfiles = { ...aiProfiles, [team]: profileId };
      await set(profilesRef, updatedProfiles);
      setAiProfiles(updatedProfiles);
    } catch (err) {
      console.error("Error saving AI profile:", err);
    }
  };

  const saveAiPrompt = async (team, prompt, profileId = null) => {
    try {
      // בדיקה אם המשתמש ציין מגבלת מספר
      const hasNumberConstraint = prompt.toLowerCase().includes('רמז ל-') || 
                                   prompt.toLowerCase().includes('מילה 1') ||
                                   prompt.toLowerCase().includes('מילה אחת') ||
                                   prompt.toLowerCase().includes('בלבד') ||
                                   /\d+\s*מיל/i.test(prompt);
      
      if (prompt.trim() && !hasNumberConstraint) {
        toast.warning("💡 מומלץ לציין מגבלת מספר (למשל: 'רמז ל-1 מילה בלבד') כדי שAI יכבד את המגבלה");
      }

      // Save both prompt and profile
      const promptsRef = ref(db, `games/${gameId}/aiPrompts`);
      const updatedPrompts = { ...aiPrompts, [team]: prompt };
      await set(promptsRef, updatedPrompts);
      setAiPrompts(updatedPrompts);

      // Save profile if provided
      if (profileId !== null) {
        await saveAiProfile(team, profileId);
      }

      setSavedPrompts(prev => ({ ...prev, [team]: true }));
      toast.success(`פרומפט AI עודכן עבור הקבוצה ה${team === 'red' ? 'אדומה' : 'כחולה'}`);
    } catch (err) {
      toast.error("שגיאה בשמירת פרומפט AI");
    }
  };


  const handleAddAI = async (team, role) => {
    if (!isCreator) {
      toast.error("רק יוצר החדר יכול להוסיף שחקני AI");
      return;
    }

    // Prevent rapid clicking
    if (isAddingAI) {
      toast.warn("כבר מוסיף שחקן AI, אנא המתן");
      return;
    }

    // More strict validation - check both team and role
    const teamPlayers = players.filter(p => p.team === team);
    const roleExists = teamPlayers.find(p => role === "spymaster" ? p.isSpymaster : !p.isSpymaster);
    
    if (roleExists) {
      toast.warn("כבר קיים שחקן בתפקיד הזה");
      return;
    }
    
    // Additional check: prevent too many players in team
    if (teamPlayers.length >= 2) {
      toast.warn("כבר יש מספיק שחקנים בקבוצה הזו");
      return;
    }
    
    // Check if we're about to create a duplicate (defensive programming)
    const duplicateCheck = players.find(p => p.userID.startsWith('ai-') && p.team === team && p.isSpymaster === (role === "spymaster"));
    if (duplicateCheck) {
      toast.warn("נמצא AI כפול - מונע הוספה");
      return;
    }

    setIsAddingAIWithTimeout(true);

    const aiId = `ai-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const aiName = `AI ${team === "Red" ? "אדום" : "כחול"} ${role === "spymaster" ? "לוחש" : "סוכן"} #${Math.floor(Math.random() * 10000)}`;

    const aiPlayer = {
      userID: aiId,
      username: aiName,
      team,
      isSpymaster: role === "spymaster"
    };

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const response = await fetch(`${API_BASE}/api/playeringames/${gameId}/add-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: parseInt(gameId),
          userID: aiPlayer.userID,
          username: aiPlayer.username,
          team: aiPlayer.team,
          isSpymaster: aiPlayer.isSpymaster
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const resultText = await response.text();

      if (!response.ok) {
        toast.error(`שגיאה במסד הנתונים: ${resultText}`);
        return;
      }

      try {
        await retryOperation(async () => {
          await set(ref(db, `lobbies/${gameId}/players/${aiId}`), {
            ...aiPlayer,
            isAI: true
          });
        });
        
        toast.success("שחקן AI נוסף");
      } catch (firebaseError) {
        // Attempt to rollback the SQL addition
        try {
          await fetch(`${API_BASE}/api/playeringames/${gameId}/remove-ai`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aiId)
          });
        } catch (rollbackError) {
          // Rollback failed, but continue with error handling
        }
        
        toast.error("שגיאה בשמירת AI ב-Firebase - הפעולה בוטלה");
        throw firebaseError;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.error("הוספת AI נכשלה - פעולה ארוכה מדי");
      } else {
        toast.error("שגיאה בהוספת שחקן AI");
      }
    } finally {
      setIsAddingAIWithTimeout(false);
    }
  };





  const removeAI = async (aiId) => {
    if (!isCreator) {
      toast.error("רק יוצר החדר יכול להסיר שחקני AI");
      return;
    }

    if (isAddingAI) {
      toast.warn("פעולה בתהליך, אנא המתן");
      return;
    }

    // Find the AI player to remove
    const aiPlayer = players.find(p => p.userID === aiId);
    
    if (!aiPlayer) {
      toast.error("שחקן AI לא נמצא");
      return;
    }

    setIsAddingAIWithTimeout(true);

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      const res = await fetch(`${API_BASE}/api/playeringames/${gameId}/remove-ai`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiId),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const msg = await res.text();

      if (!res.ok) {
        toast.error("שגיאה בהסרת AI מהמסד");
        return;
      }

      try {
        await retryOperation(async () => {
          await set(ref(db, `lobbies/${gameId}/players/${aiId}`), null);
        });
        
        toast.success("שחקן AI הוסר בהצלחה");
      } catch (firebaseError) {
        // Attempt to rollback the SQL deletion by re-adding the AI
        try {
          await fetch(`${API_BASE}/api/playeringames/${gameId}/add-ai`, {
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
        } catch (rollbackError) {
          // Rollback failed, but continue with error handling
        }
        
        toast.error("שגיאה במחיקת AI מ-Firebase - הפעולה בוטלה");
        throw firebaseError;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        toast.error("הסרת AI נכשלה - פעולה ארוכה מדי");
      } else {
        toast.error("שגיאה כללית בהסרת שחקן AI");
      }
    } finally {
      setIsAddingAIWithTimeout(false);
    }
  };





  const joinGameIfNeeded = async (team, isSpymaster = false) => {
    try {
      const playerExistsInFirebase = players.some(p => p.userID === user.uid);

      // 🟢 חדש: נבדוק גם ב-SQL עם קריאה לאחור ל־/players
      const res = await fetch(`${API_BASE}/api/playeringames/${gameId}/players`);
      const playersInSQL = await res.json();
      const playerInSQL = playersInSQL.find(p => p.userID === user.uid);

      if (!playerInSQL) {
        // 🟠 צריך להוסיף למסד
        const joinRes = await fetch(`${API_BASE}/api/playeringames/${gameId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameID: parseInt(gameId),
            userID: user.uid,
            username: user.displayName || "ללא שם",
            team,
            isSpymaster
          })
        });

        if (!joinRes.ok) {
          const text = await joinRes.text();
          toast.error(`שגיאה בהצטרפות: ${text}`);
          return;
        }
      }

      // ⬇️ שמור לפיירבייס עם תפקיד
      await savePlayerToLobby(gameId, {
        userID: user.uid,
        username: user.displayName || "ללא שם",
        team,
        isSpymaster,
        isCreator: isCreator
      });

      toast.success(`הצטרפת לקבוצה ה${team === "Red" ? "אדומה" : "כחולה"}`);
    } catch (error) {
      toast.error("שגיאה בהצטרפות למשחק");
    }
  };




  const updatePlayer = async (team, isSpymaster, context = "") => {
    try {
      await fetch(`${API_BASE}/api/playeringames/${gameId}/update-player`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: parseInt(gameId),
          userID: user.uid,
          username: user.displayName || "ללא שם",
          team,
          isSpymaster
        })
      });

      // 🔍 שלוף את הערך הקיים של isCreator אם הוא שמור
      const existingPlayer = players.find(p => p.userID === user.uid);

      await savePlayerToLobby(gameId, {
        userID: user.uid,
        username: user.displayName || "ללא שם",
        team,
        isSpymaster,
        isCreator: existingPlayer?.isCreator === true // ✔ שימור השדה הקיים
      });

      if (context === "switch-team") {
        toast.info("הקבוצה שלך עודכנה");
      } else if (context === "spymaster-toggle") {
        toast.info(isSpymaster ? "עברת להיות לוחש 🕵️" : "עברת להיות סוכן רגיל");
      }
    } catch (error) {
      toast.error("שגיאה בעדכון שחקן");
    }
  };



  const leaveTeam = async () => {
    // Set flag to prevent cleanup from running
    setIsManualLeaving(true);
    
    try {
      // Use the same mechanism as kickPlayer - this works without errors
      const requestData = {
        creatorUserID: user.uid,  // User kicks themselves
        targetUserID: user.uid    // Target is themselves
      };
      
      const res = await fetch(`${API_BASE}/api/playeringames/${gameId}/kick`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData)
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "שגיאה בהסרת השחקן");
        return;
      }

      // Remove from Firebase (same as kickPlayer)
      await set(ref(db, `lobbies/${gameId}/players/${user.uid}`), null);
      
      const result = await res.json();
      toast.success(result.message || "יצאת מהקבוצה");

    } catch (err) {
      toast.error("שגיאה ביציאה מהקבוצה");
    } finally {
      // Reset flag after a brief delay to allow component unmount
      setTimeout(() => setIsManualLeaving(false), 1000);
    }
  };

  const kickPlayer = async (targetUserId) => {
    if (!isCreator) {
      toast.error("רק יוצר החדר יכול להסיר שחקנים");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/playeringames/${gameId}/kick`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorUserID: user.uid,
          targetUserID: targetUserId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "שגיאה בהסרת השחקן");
        return;
      }

      // Remove from Firebase
      await set(ref(db, `lobbies/${gameId}/players/${targetUserId}`), null);
      
      const result = await res.json();
      toast.success(result.message || "השחקן הוסר מהמשחק");
    } catch (err) {
      toast.error("שגיאה בהסרת השחקן");
    }
  };


  const toggleSpymaster = (team) => {
    const player = players.find(p => p.userID === user.uid);
    if (!player || player.team !== team) return;
    const alreadySpymaster = player.isSpymaster;
    if (!alreadySpymaster) {
      const teamSpymaster = players.find(p => p.team === team && p.isSpymaster);
      if (teamSpymaster) {
        toast.error("כבר יש לוחש בקבוצה הזו");
        return;
      }
    }
    updatePlayer(team, !alreadySpymaster, "spymaster-toggle");
  };

  const checkIfReady = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/playeringames/${gameId}/is-ready`);
      const data = await res.json();
      return data.isReady;
    } catch (err) {
      toast.error("שגיאה בבדיקת מוכנות המשחק");
      return false;
    }
  };

  const startGame = async () => {
    const ready = await checkIfReady();
    if (!ready) {
      toast.warn("המשחק עדיין לא מוכן – חייב לוחש וסוכן בכל קבוצה");
      return;
    }
  
    try {
      // ⬅️ שלב חדש: שליפת gameType מ־Firebase
      const settingsRef = ref(db, `games/${gameId}/settings/gameType`);
      const snapshot = await new Promise((resolve) => onValue(settingsRef, resolve, { onlyOnce: true }));
      const gameType = snapshot.exists() ? snapshot.val() : "classic";
  
      // ✅ שולח gameType לשרת
      const res = await fetch(`${API_BASE}/api/games/${gameId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameType)
      });
  
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message || "שגיאה בהתחלת המשחק");
        return;
      }
  
      await saveBoardToFirebase(gameId, data.board);
  
      // קביעת הקבוצה המתחילה לפי מי שקיבל יותר קלפים (9 קלפים)
      console.log("🔍 Board data sample:", data.board.slice(0, 3)); // לראות איך נראים הקלפים
      const redCards = data.board.filter(card => (card.Team || card.team) === "Red").length;
      const blueCards = data.board.filter(card => (card.Team || card.team) === "Blue").length;
      const neutralCards = data.board.filter(card => (card.Team || card.team) === "Neutral").length;
      const assassinCards = data.board.filter(card => (card.Team || card.team) === "Assassin").length;
      
      console.log(`📊 Cards count - Red: ${redCards}, Blue: ${blueCards}, Neutral: ${neutralCards}, Assassin: ${assassinCards}`);
      
      const startingTeam = redCards > blueCards ? "Red" : "Blue";
      console.log(`🎯 Starting team: ${startingTeam} (הקבוצה עם ${Math.max(redCards, blueCards)} קלפים מתחילה)`);
      
      await setTurn(gameId, startingTeam);
  
      const turnStartRes = await fetch(`${API_BASE}/api/turns/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameID: gameId, team: startingTeam })
      });
  
      const text = await turnStartRes.text();
  
      let turnStartData;
      try {
        turnStartData = JSON.parse(text);
      } catch (err) {
        toast.error("שגיאה בפענוח תשובת שרת");
        return;
      }
  
      const turnId = turnStartData.TurnID ?? turnStartData.turnID;
      if (!turnId) {
        toast.error("⚠️ תשובה לא תקינה מהשרת – חסר turnID");
        return;
      }
  
      await set(ref(db, `games/${gameId}/currentTurnId`), turnId);
      await set(ref(db, `games/${gameId}/currentTurn`), startingTeam);
      await set(ref(db, `games/${gameId}/turnStart`), Date.now());
  
      const statusRes = await fetch(`${API_BASE}/api/games/${gameId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("In Progress")
      });
  
      if (!statusRes.ok) {
        toast.error("סטטוס המשחק במסד לא עודכן");
        return;
      }
  
      await set(ref(db, `lobbies/${gameId}/status`), "started");
    } catch (err) {
      toast.error("שגיאה בהתחלת המשחק");
    }
  };
  
  
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="relative z-50">
        <Header />
      </div>
      <BackgroundImage image={codenamesImage} />

      <main className="relative z-10 flex-1 pt-28 pb-20" dir="rtl">
        {/* Friends List - Fixed to right */}
        <div className="hidden xl:block fixed right-3 top-32 w-72 max-h-[calc(100vh-140px)] overflow-y-auto">
          <div className="bg-gray-800/90 backdrop-blur p-4 rounded-2xl text-white shadow-xl border border-gray-700">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              חברים מחוברים
            </h2>
            <OnlineFriendsList userId={user?.uid} gameId={gameId} />
          </div>
        </div>

        {/* Main Game Content */}
        <div className="container mx-auto px-4 xl:pr-80">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-[1600px] mx-auto"
          >
            <div className="text-center mb-6 lg:mb-8">
              <div className="flex items-center justify-center gap-4 mb-2">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">חדר משחק #{gameId}</h1>
                <button
                  onClick={() => setIsRulesModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm md:text-base shadow-lg"
                  title="הצג חוקי משחק"
                >
                  <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
                  חוקי המשחק
                </button>
              </div>
              <p className="text-base md:text-lg text-gray-300">בחר קבוצה ותפקיד כדי להתחיל לשחק</p>
            </div>

            {/* Desktop and Large Tablet Layout */}
            <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-3 xl:grid-cols-7 gap-4 lg:gap-8">
              {/* Blue Team */}
              <div className="lg:col-span-1 xl:col-span-2">
                <TeamSection
                  teamColor="Blue"
                  players={players}
                  userId={user?.uid}
                  onSwitchTeam={() => {
                    joinGameIfNeeded("Red", false);
                    updatePlayer("Red", false, "switch-team");
                  }}
                  onToggleSpymaster={() => toggleSpymaster("Blue")}
                  onLeave={leaveTeam}
                  onKickPlayer={kickPlayer}
                  onJoinAsAgent={() => joinGameIfNeeded("Blue", false)}
                  onJoinAsSpymaster={() => joinGameIfNeeded("Blue", true)}
                  handleAddAI={handleAddAI}
                  isCreator={isCreator}
                  removeAI={removeAI}
                  aiPrompts={aiPrompts}
                  setAiPrompts={setAiPrompts}
                  saveAiPrompt={saveAiPrompt}
                  savedPrompts={savedPrompts}
                  setSavedPrompts={setSavedPrompts}
                  aiProfiles={aiProfiles}
                  saveAiProfile={saveAiProfile}
                />
              </div>

              {/* Game Settings & Start Button - In Center */}
              <div className="md:col-span-1 lg:col-span-1 xl:col-span-3 md:order-last lg:order-none">
                <div className="flex flex-col gap-4 h-full max-w-[1000px] mx-auto w-full px-4">
                  <GameSettings 
                    gameId={gameId} 
                    isOwner={isCreator} 
                    isCreator={isCreator}
                    onStartGame={startGame}
                  />
                </div>
              </div>

              {/* Red Team */}
              <div className="lg:col-span-1 xl:col-span-2">
                <TeamSection
                  teamColor="Red"
                  players={players}
                  userId={user?.uid}
                  onSwitchTeam={() => {
                    joinGameIfNeeded("Blue", false);
                    updatePlayer("Blue", false, "switch-team");
                  }}
                  onToggleSpymaster={() => toggleSpymaster("Red")}
                  onLeave={leaveTeam}
                  onKickPlayer={kickPlayer}
                  onJoinAsAgent={() => joinGameIfNeeded("Red", false)}
                  onJoinAsSpymaster={() => joinGameIfNeeded("Red", true)}
                  handleAddAI={handleAddAI}
                  isCreator={isCreator}
                  removeAI={removeAI}
                  aiPrompts={aiPrompts}
                  setAiPrompts={setAiPrompts}
                  saveAiPrompt={saveAiPrompt}
                  savedPrompts={savedPrompts}
                  setSavedPrompts={setSavedPrompts}
                  aiProfiles={aiProfiles}
                  saveAiProfile={saveAiProfile}
                />
              </div>
            </div>

            {/* Mobile and Small Tablet Layout */}
            <div className="md:hidden space-y-6">
              {/* Game Settings & Start Button - Top on mobile */}
              <div className="flex flex-col gap-4">
                <div className="w-full max-w-[600px] mx-auto px-4">
                  <GameSettings 
                    gameId={gameId} 
                    isOwner={isCreator}
                    isCreator={isCreator}
                    onStartGame={startGame}
                  />
                </div>
              </div>

              {/* Teams */}
              <div className="space-y-6">
                <TeamSection
                  teamColor="Blue"
                  players={players}
                  userId={user?.uid}
                  onSwitchTeam={() => {
                    joinGameIfNeeded("Red", false);
                    updatePlayer("Red", false, "switch-team");
                  }}
                  onToggleSpymaster={() => toggleSpymaster("Blue")}
                  onLeave={leaveTeam}
                  onKickPlayer={kickPlayer}
                  onJoinAsAgent={() => joinGameIfNeeded("Blue", false)}
                  onJoinAsSpymaster={() => joinGameIfNeeded("Blue", true)}
                  handleAddAI={handleAddAI}
                  isCreator={isCreator}
                  removeAI={removeAI}
                  aiPrompts={aiPrompts}
                  setAiPrompts={setAiPrompts}
                  saveAiPrompt={saveAiPrompt}
                  savedPrompts={savedPrompts}
                  setSavedPrompts={setSavedPrompts}
                  aiProfiles={aiProfiles}
                  saveAiProfile={saveAiProfile}
                />
                
                <TeamSection
                  teamColor="Red"
                  players={players}
                  userId={user?.uid}
                  onSwitchTeam={() => {
                    joinGameIfNeeded("Blue", false);
                    updatePlayer("Blue", false, "switch-team");
                  }}
                  onToggleSpymaster={() => toggleSpymaster("Red")}
                  onLeave={leaveTeam}
                  onKickPlayer={kickPlayer}
                  onJoinAsAgent={() => joinGameIfNeeded("Red", false)}
                  onJoinAsSpymaster={() => joinGameIfNeeded("Red", true)}
                  handleAddAI={handleAddAI}
                  isCreator={isCreator}
                  removeAI={removeAI}
                  aiPrompts={aiPrompts}
                  setAiPrompts={setAiPrompts}
                  saveAiPrompt={saveAiPrompt}
                  savedPrompts={savedPrompts}
                  setSavedPrompts={setSavedPrompts}
                  aiProfiles={aiProfiles}
                  saveAiProfile={saveAiProfile}
                />
              </div>
            </div>

            {/* Tablet Friends List */}
            <div className="xl:hidden mt-6">
              <div className="bg-gray-800/90 backdrop-blur p-4 rounded-2xl text-white shadow-xl border border-gray-700">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  חברים מחוברים
                </h2>
                <OnlineFriendsList userId={user?.uid} gameId={gameId} />
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer className="sticky bottom-0 relative z-50 mt-auto" />
      
      {/* Rules Modal */}
      <RulesModal 
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
};

export default GameLobby;

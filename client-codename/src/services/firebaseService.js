import { onDisconnect, onValue, push, ref, remove, serverTimestamp, set, get } from "firebase/database";
import { db } from "../../firebaseConfig"; // בגלל שהfirebaseConfig.js נמצא בשורש
import API_BASE from '../config/api.js';


/**
 * שומר שחקן ב־Realtime Database
 * @param {string} gameId - מזהה המשחק
 * @param {object} player - { userID, username, team, isSpymaster }
 */
export const savePlayerToLobby = (gameId, player) => {
  const playerRef = ref(db, `lobbies/${gameId}/players/${player.userID}`);
  
  // Removed automatic cleanup on disconnect to prevent delays
  
  return set(playerRef, {
    userID: player.userID,
    username: player.username,
    team: player.team,
    isSpymaster: player.isSpymaster,
    isAI: player.isAI || false,
    isCreator: player.isCreator || false
  });
};


export const subscribeToLobbyPlayers = (gameId, callback) => {
  const playersRef = ref(db, `lobbies/${gameId}/players`);
  return onValue(playersRef, (snapshot) => {
    const data = snapshot.val();
    const players = data ? Object.entries(data).map(([userID, val]) => ({ userID, ...val })) : [];
    callback(players);
  });
};

// ✅ עדכון קלף בפיירבייס - מוצא את הקלף לפי wordID ומעדכן בנפרד
export const updateCardInFirebase = async (gameId, updatedCard) => {
  try {
    // First, get the current board to find the correct card index
    const boardRef = ref(db, `games/${gameId}/cards`);
    const snapshot = await get(boardRef);
    const currentCards = snapshot.val();
    
    if (!currentCards) {
      console.error("❌ No cards found in Firebase for game:", gameId);
      return;
    }

    // Find the card index by matching wordID or word
    let cardIndex = null;
    const cardsArray = Object.entries(currentCards);
    
    for (const [index, card] of cardsArray) {
      if (card.wordID === updatedCard.wordID || 
          (card.word === updatedCard.word && card.wordID === updatedCard.wordID)) {
        cardIndex = index;
        break;
      }
    }

    if (cardIndex === null) {
      console.error("❌ Could not find card to update:", updatedCard);
      return;
    }

    // Update the specific card at its index
    const specificCardRef = ref(db, `games/${gameId}/cards/${cardIndex}`);
    const cardToUpdate = {
      ...currentCards[cardIndex],
      ...updatedCard,
      index: parseInt(cardIndex) // Preserve the index
    };
    
    console.log(`🔄 Updating card at index ${cardIndex}:`, cardToUpdate);
    return set(specificCardRef, cardToUpdate);
    
  } catch (error) {
    console.error("❌ Error updating card in Firebase:", error);
    throw error;
  }
};

// ✅ שליחת רמז לרשימת הרמזים הכללית (אופציונלי אם אתה עוקב אחרי כל הרמזים)
export const sendClueToFirebase = (gameId, clue) => {
  const cluesRef = ref(db, `games/${gameId}/clues`);
  return push(cluesRef, clue);
};

export const subscribeToClues = (gameId, callback) => {
  const cluesRef = ref(db, `games/${gameId}/clues`);
  return onValue(cluesRef, (snapshot) => {
    const data = snapshot.val();
    callback(data ? Object.values(data) : []);
  });
};

export const saveBoardToFirebase = (gameId, cards) => {
  const boardRef = ref(db, `games/${gameId}/cards`);
  // Save cards with consistent indexing - each card at its array index
  const cardsByIndex = {};
  cards.forEach((card, index) => {
    cardsByIndex[index] = {
      ...card,
      index: index // Store the original array index for consistent updates
    };
  });
  return set(boardRef, cardsByIndex);
};

/**
 * האזנה לשינויים בלוח Id - מזהה המשחק
 * @param {function} callback - פונקציה שתרוץ כשיש שינוי
 */

// ✅ שליחת ניחוש לצ'אט
export const sendGuessMessage = (gameId, messageObj) => {
  const refPath = ref(db, `games/${gameId}/guesses`);
  return push(refPath, messageObj);
};

// ✅ האזנה להודעות ניחוש בפאנל הצ'אט
export const subscribeToGuessMessages = (gameId, callback) => {
  const refPath = ref(db, `games/${gameId}/guesses`);
  return onValue(refPath, (snapshot) => {
    const data = snapshot.val();
    const list = data ? Object.values(data) : [];
    callback(list);
  });
};

// ✅ שליחת ניחוש לשרת כדי לעדכן ניקוד ב-SQL
export const logGuessToServer = async (gameId, userId, guessType) => {
  try {
    const res = await fetch(`${API_BASE}/api/playeringames/${gameId}/log-guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userID: userId,
        guessType
      })
    });

    const text = await res.text();
    console.log("📝 תשובת שרת (SQL):", text);
  } catch (error) {
    console.error("❌ שגיאה בשליחת ניחוש ל-SQL:", error);
  }
};

// ✅ חדש: הגדרת תור נוכחי
export const setTurn = (gameId, team) => {
  const turnRef = ref(db, `games/${gameId}/turn`);
  return set(turnRef, team);
};


// האזנה לתור הנוכחי + איפוס כללי
export const subscribeToTurn = (gameId, callback) => {
  const turnRef = ref(db, `games/${gameId}/turn`);
  return onValue(turnRef, async (snapshot) => {
    const team = snapshot.val();
    callback(team);

    // איפוס הרמז הכללי (אופציונלי, רק אם אתה עוד משתמש בו איפשהו)
    const legacyClueRef = ref(db, `games/${gameId}/lastClue`);
    await set(legacyClueRef, null);

  });
};


// ✅ שמירת הרמז האחרון לפי TurnID
export const setLastClue = (gameId, turnId, clue) => {
  const refPath = ref(db, `games/${gameId}/lastClues/${turnId}`);
  return set(refPath, clue);
};


// ✅ האזנה לרמז של תור מסוים
export const subscribeToLastClue = (gameId, turnId, callback) => {
  const clueRef = ref(db, `games/${gameId}/lastClues/${turnId}`);
  return onValue(clueRef, (snapshot) => {
    const clue = snapshot.val();
    callback(clue);
  });
};

// ✅ הגדרת מנצח
export const setWinner = (gameId, winner) => {
  const refWinner = ref(db, `games/${gameId}/winner`);
  return set(refWinner, winner);
};

export const subscribeToWinner = (gameId, callback) => {
  const refWinner = ref(db, `games/${gameId}/winner`);
  return onValue(refWinner, (snapshot) => {
    callback(snapshot.val());
  });
};

export const setGameEnded = (gameId) => {
  const refEnded = ref(db, `games/${gameId}/gameEnded`);
  return set(refEnded, true);
};

export const subscribeToGameEnded = (gameId, callback) => {
  const refEnded = ref(db, `games/${gameId}/gameEnded`);
  return onValue(refEnded, (snapshot) => {
    const ended = snapshot.val();
    callback(ended);
  });
};

//FRIENDS SECTION////////////////////////////////////////////////////
export const subscribeToBoard = (gameId, callback) => {
  const boardRef = ref(db, `games/${gameId}/cards`);
  return onValue(boardRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) {
      callback([]);
      return;
    }

    // Convert the indexed object back to an array, preserving order
    const cards = [];
    const maxIndex = Math.max(...Object.keys(data).map(key => parseInt(key)));
    
    for (let i = 0; i <= maxIndex; i++) {
      if (data[i]) {
        cards[i] = data[i];
      }
    }
    
    // Remove any gaps and ensure we have exactly 25 cards
    const cleanCards = cards.filter(card => card != null);
    
    console.log("📦 קלפים מ־Firebase:", cleanCards.length, "cards loaded");
    callback(cleanCards);
  });
};

export const notifyFriendSync = (userId) => {
  const syncRef = ref(db, `friendSync/${userId}`);
  return set(syncRef, Date.now());
};

// Listen for changes in friendSync/{userId}
export const subscribeToFriendSync = (userId, callback) => {
  const syncRef = ref(db, `friendSync/${userId}`);
  return onValue(syncRef, () => {
    callback();
  });
};

// Save new message between two users
export const sendMessage = (userId1, userId2, messageObj) => {
  const chatId = [userId1, userId2].sort().join("_");
  const chatRef = ref(db, `chats/${chatId}`);
  const newMessageRef = push(chatRef);
  return set(newMessageRef, messageObj);
};

// Listen to messages between two users
export const subscribeToChat = (userId1, userId2, callback) => {
  const chatId = [userId1, userId2].sort().join("_");
  const chatRef = ref(db, `chats/${chatId}`);
  return onValue(chatRef, (snapshot) => {
    const messages = snapshot.val() || {};
    const messageArray = Object.entries(messages).map(([id, value]) => ({ id, ...value }));
    callback(messageArray);
  });
};

// Clear chat if last message is older than 12 hours (optional helper)
export const clearChatIfOld = async (userId1, userId2) => {
  const chatId = [userId1, userId2].sort().join("_");
  const chatRef = ref(db, `chats/${chatId}`);
  onValue(chatRef, (snapshot) => {
    const messages = snapshot.val();
    if (!messages) return;

    const lastMessage = Object.values(messages).slice(-1)[0];
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

    if (lastMessage?.timestamp < twelveHoursAgo) {
      remove(chatRef);
    }
  });
};

// Check if new messages were received
export const subscribeToUnreadMessages = (userId, callback) => {
  const unreadRef = ref(db, `unread/${userId}`);
  return onValue(unreadRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data); // Format: { [friendId]: true }
  });
};

// Mark messages as read after opening chat
export const clearUnreadForFriend = (userId, friendId) => {
  const refPath = ref(db, `unread/${userId}/${friendId}`);
  return remove(refPath);
};

// Check if new unread message was received for a specific chat
export const subscribeToChatMeta = (currentUserId, friendId, callback) => {
  const notifyRef = ref(db, `unreadMessages/${currentUserId}/${friendId}`);
  return onValue(notifyRef, (snapshot) => {
    const hasNew = snapshot.exists();
    callback(hasNew);
  });
};

// ✅ 🔔 שליחת התראה על בקשת חברות חדשה
export const notifyFriendRequestAlert = (receiverId) => {
  const alertRef = ref(db, `friendRequestAlerts/${receiverId}`);
  return set(alertRef, true);
};

// ✅ האזנה להתראות על בקשת חברות
export const subscribeToFriendRequestAlerts = (userId, callback) => {
  const alertRef = ref(db, `friendRequestAlerts/${userId}`);
  return onValue(alertRef, (snapshot) => {
    const hasAlert = snapshot.exists();
    callback(hasAlert);
  });
};

// אופציונלי – לנקות התראה לאחר שהוצגה
export const clearFriendRequestAlert = (userId) => {
  const alertRef = ref(db, `friendRequestAlerts/${userId}`);
  return remove(alertRef);
};
// Enhanced user online status with detailed game tracking
export const setUserOnlineStatus = (userId, isInGame = false, gameId = null) => {
  const statusRef = ref(db, `playersStatus/${userId}`);

  const onlineStatus = {
    online: true,
    inGame: isInGame,
    gameId: gameId,
    lastSeen: serverTimestamp(),
    lastActivity: serverTimestamp(),
    connectionQuality: 'good' // good, poor, disconnected
  };

  const offlineStatus = {
    online: false,
    inGame: false,
    gameId: null,
    lastSeen: serverTimestamp(),
    lastActivity: serverTimestamp(),
    connectionQuality: 'disconnected'
  };

  // קובע את המשתמש כ-online
  set(statusRef, onlineStatus);

  // אם הדפדפן נסגר, המשתמש יהפוך אוטומטית ל-offline
  onDisconnect(statusRef).set(offlineStatus);
};

// Enhanced game-specific presence tracking
export const setGamePresence = (userId, gameId, isActive = true, currentTurn = false) => {
  const gamePresenceRef = ref(db, `gamePresence/${gameId}/${userId}`);
  
  const presenceData = {
    userId,
    isActive,
    isCurrentTurn: currentTurn,
    lastActivity: serverTimestamp(),
    lastHeartbeat: serverTimestamp(),
    connectionStatus: 'connected'
  };

  const disconnectedData = {
    userId,
    isActive: false,
    isCurrentTurn: false,
    lastActivity: serverTimestamp(),
    lastHeartbeat: serverTimestamp(),
    connectionStatus: 'disconnected'
  };

  set(gamePresenceRef, presenceData);
  onDisconnect(gamePresenceRef).set(disconnectedData);
  
  return gamePresenceRef;
};

// Activity heartbeat system
export const sendActivityHeartbeat = (userId, gameId, action = 'heartbeat') => {
  const heartbeatRef = ref(db, `gamePresence/${gameId}/${userId}/lastHeartbeat`);
  const activityRef = ref(db, `gamePresence/${gameId}/${userId}/lastActivity`);
  const actionRef = ref(db, `gamePresence/${gameId}/${userId}/lastAction`);
  
  // Use Date.now() for consistent number timestamps that work with math operations
  const timestamp = Date.now();
  
  set(heartbeatRef, timestamp);
  set(activityRef, timestamp);
  set(actionRef, { action, timestamp });
};

// Subscribe to game presence for all players
export const subscribeToGamePresence = (gameId, callback) => {
  const gamePresenceRef = ref(db, `gamePresence/${gameId}`);
  return onValue(gamePresenceRef, (snapshot) => {
    const presenceData = snapshot.val() || {};
    callback(presenceData);
  });
};

// Monitor player timeouts and disconnections with automatic AI replacement
export const monitorPlayerTimeouts = (gameId, timeoutThresholds = { turn: 45000, general: 90000 }) => {
  const gamePresenceRef = ref(db, `gamePresence/${gameId}`);
  
  return onValue(gamePresenceRef, (snapshot) => {
    const presenceData = snapshot.val() || {};
    const currentTime = Date.now();
    
    Object.entries(presenceData).forEach(async ([userId, data]) => {
      // Skip AI players and already processed players
      if (!data.lastHeartbeat || userId.startsWith('ai-') || 
          data.connectionStatus === 'timeout' || 
          data.connectionStatus === 'disconnected') {
        return;
      }
      
      const timeSinceHeartbeat = currentTime - data.lastHeartbeat;
      const isCurrentTurn = data.isCurrentTurn;
      
      // Use provided timeout thresholds
      const threshold = isCurrentTurn ? timeoutThresholds.turn : timeoutThresholds.general;
      
      // Check if player has timed out
      if (timeSinceHeartbeat > threshold) {
        console.log(`🔴 Player ${userId} timed out: ${timeSinceHeartbeat}ms since last heartbeat`);
        
        try {
          // Mark player as disconnected first
          await handlePlayerDisconnection(gameId, userId, 'ai');
          
          // Trigger timeout event for the UI
          const timeoutEventRef = ref(db, `gameEvents/${gameId}/playerTimeouts`);
          await push(timeoutEventRef, {
            userId,
            type: isCurrentTurn ? 'turn_timeout' : 'general_timeout',
            timestamp: serverTimestamp(),
            timeSinceLastActivity: timeSinceHeartbeat
          });
          
          console.log(`🤖 Triggered AI replacement for player ${userId}`);
        } catch (error) {
          console.error('Error handling player timeout:', error);
        }
      }
    });
  });
};

// Set player as disconnected and trigger replacement
export const handlePlayerDisconnection = async (gameId, userId, replacementType = 'ai') => {
  try {
    console.log(`🔥 [FIREBASE] handlePlayerDisconnection called:`, {
      gameId,
      userId,
      replacementType,
      timestamp: new Date().toISOString()
    });

    // Check if player is already marked as disconnected to prevent duplicates
    const presenceRef = ref(db, `gamePresence/${gameId}/${userId}`);
    const presenceSnap = await get(presenceRef);
    const currentPresence = presenceSnap.val();
    
    if (currentPresence && currentPresence.connectionStatus === 'disconnected') {
      console.log(`⚠️ [FIREBASE] Player ${userId} already marked as disconnected - skipping`);
      return false;
    }

    // Mark player as disconnected
    await set(presenceRef, {
      userId,
      isActive: false,
      connectionStatus: 'disconnected',
      disconnectedAt: serverTimestamp(),
      replacementType,
      processedAt: null // Will be set when AI replacement is complete
    });
    
    console.log(`🔴 [FIREBASE] Marked player ${userId} as disconnected in presence`);

    // Check if disconnection event already exists to prevent duplicates
    const eventsRef = ref(db, `gameEvents/${gameId}/disconnections`);
    const eventsSnap = await get(eventsRef);
    const existingEvents = eventsSnap.val() || {};
    
    // Check for existing disconnection event for this user
    const existingEvent = Object.values(existingEvents).find(event => event.userId === userId);
    if (existingEvent) {
      console.log(`⚠️ [FIREBASE] Disconnection event already exists for ${userId} - skipping event creation`);
      return false;
    }

    // Trigger disconnection event only if none exists
    await push(eventsRef, {
      userId,
      timestamp: serverTimestamp(),
      replacementType,
      reason: 'timeout_or_disconnect',
      processed: false
    });
    
    console.log(`📤 [FIREBASE] Created new disconnection event for ${userId}`);

    return true;
  } catch (error) {
    console.error(`💥 [FIREBASE] Error handling player disconnection:`, {
      error: error.message,
      stack: error.stack,
      gameId,
      userId,
      replacementType
    });
    return false;
  }
};

// Subscribe to game events (disconnections, timeouts, etc.)
export const subscribeToGameEvents = (gameId, callback) => {
  const eventsRef = ref(db, `gameEvents/${gameId}`);
  return onValue(eventsRef, (snapshot) => {
    const events = snapshot.val() || {};
    callback(events);
  });
};

// Player reconnection functionality
export const attemptPlayerReconnection = async (userId, gameId) => {
  try {
    // Check if player was in this game
    const playerRef = ref(db, `lobbies/${gameId}/players/${userId}`);
    const snapshot = await get(playerRef);
    
    if (!snapshot.exists()) {
      return { success: false, reason: 'player_not_in_game' };
    }

    const playerData = snapshot.val();
    
    // Check if there's an AI replacement for this player
    const presenceRef = ref(db, `gamePresence/${gameId}/${userId}`);
    const presenceSnapshot = await get(presenceRef);
    
    // Only offer reconnection if player was actually disconnected and replaced
    if (presenceSnapshot.exists()) {
      const presenceData = presenceSnapshot.val();
      
      // Check if player was marked as disconnected and replaced with AI
      if (presenceData.connectionStatus === 'disconnected' && presenceData.replacementType === 'ai') {
        return { 
          success: true, 
          playerData, 
          needsAIReplacement: true,
          reason: 'can_replace_ai' 
        };
      }
      
      // If player is already connected/active, no need to reconnect
      if (presenceData.connectionStatus === 'connected' && presenceData.isActive) {
        return { success: false, reason: 'already_connected' };
      }
    }

    // If no presence data exists, this is likely first connection, not reconnection
    return { success: false, reason: 'first_connection' };
  } catch (error) {
    console.error('Error checking reconnection eligibility:', error);
    return { success: false, reason: 'error', error };
  }
};

// Restore player and remove AI replacement
export const restorePlayerFromAI = async (gameId, userId, aiPlayerId) => {
  try {
    // Mark AI as inactive
    if (aiPlayerId) {
      const aiPresenceRef = ref(db, `gamePresence/${gameId}/${aiPlayerId}`);
      await set(aiPresenceRef, {
        userId: aiPlayerId,
        isActive: false,
        connectionStatus: 'replaced_by_human',
        replacedAt: serverTimestamp()
      });
    }

    // Restore human player presence
    await setGamePresence(userId, gameId, true, false);

    // Log reconnection event
    const eventRef = ref(db, `gameEvents/${gameId}/reconnections`);
    await push(eventRef, {
      userId,
      aiPlayerId,
      timestamp: serverTimestamp(),
      type: 'player_restored'
    });

    return true;
  } catch (error) {
    console.error('Error restoring player from AI:', error);
    return false;
  }
};

// Check for reconnection opportunities on game load
export const checkReconnectionOpportunity = async (userId, gameId) => {
  try {
    const reconnectionData = await attemptPlayerReconnection(userId, gameId);
    
    if (reconnectionData.success && reconnectionData.needsAIReplacement) {
      // Notify user about reconnection opportunity
      return {
        canReconnect: true,
        message: 'נראה שהתנתקת מהמשחק. האם ברצונך להתחבר מחדש ולהחליף את ה-AI?',
        playerData: reconnectionData.playerData
      };
    } else if (reconnectionData.success) {
      // Normal reconnection
      return {
        canReconnect: true,
        message: 'מתחבר מחדש למשחק...',
        playerData: reconnectionData.playerData
      };
    }
    
    return { canReconnect: false };
  } catch (error) {
    console.error('Error checking reconnection opportunity:', error);
    return { canReconnect: false };
  }
};

export const subscribeToReceivedFriendRequests = (userId, callback) => {
  const refPath = ref(db, `friendRequestsStatus`);
  return onValue(refPath, (snapshot) => {
    const allStatuses = snapshot.val() || {};
    const received = Object.entries(allStatuses)
      .flatMap(([senderId, receivers]) =>
        Object.entries(receivers).filter(
          ([receiverId, status]) =>
            receiverId === userId && status === "Pending"
        ).map(([receiverId, status]) => ({ senderId, receiverId, status }))
      );
    if (received.length > 0) {
      callback(); // ניתן גם להעביר את הרשימה אם צריך
    }
  });
};

//============================================================================
// סיום מערכת חברים והודעות פרטיות
//============================================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { ref, onValue } from 'firebase/database';
import { db } from '../../firebaseConfig';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [openChats, setOpenChats] = useState(new Map()); // friendId -> chat data
  const [unreadMessages, setUnreadMessages] = useState({});
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [showChatButton, setShowChatButton] = useState(true);
  const [showFriendsList, setShowFriendsList] = useState(false);

  // Monitor unread messages
  useEffect(() => {
    if (!user?.uid) return;

    const unreadRef = ref(db, `unreadMessages/${user.uid}`);
    const unsubscribe = onValue(unreadRef, (snapshot) => {
      const data = snapshot.val() || {};
      setUnreadMessages(data);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Open a chat with a friend (or close if already open)
  const openChat = (friendId, friendName) => {
    setOpenChats(prev => {
      const newChats = new Map(prev);
      
      // If chat is already open, close it (toggle behavior)
      if (newChats.has(friendId)) {
        newChats.delete(friendId);
        // Recalculate positions for remaining chats
        let index = 0;
        for (const [id, chat] of newChats) {
          newChats.set(id, {
            ...chat,
            position: calculatePosition(index)
          });
          index++;
        }
      } else {
        // If chat is not open, open it
        newChats.set(friendId, {
          friendId,
          friendName,
          isMinimized: false,
          position: calculatePosition(newChats.size)
        });
        // Mark as read when opening
        markAsRead(friendId);
      }
      
      return newChats;
    });
  };

  // Close a chat
  const closeChat = (friendId) => {
    setOpenChats(prev => {
      const newChats = new Map(prev);
      newChats.delete(friendId);
      // Recalculate positions for remaining chats
      let index = 0;
      for (const [id, chat] of newChats) {
        newChats.set(id, {
          ...chat,
          position: calculatePosition(index)
        });
        index++;
      }
      return newChats;
    });
  };

  // Toggle chat minimize/maximize
  const toggleChatMinimize = (friendId) => {
    setOpenChats(prev => {
      const newChats = new Map(prev);
      const chat = newChats.get(friendId);
      if (chat) {
        newChats.set(friendId, {
          ...chat,
          isMinimized: !chat.isMinimized
        });
      }
      return newChats;
    });
  };

  // Mark messages as read
  const markAsRead = (friendId) => {
    setUnreadMessages(prev => ({
      ...prev,
      [friendId]: false
    }));
  };

  // Calculate position for stacked chat windows
  const calculatePosition = (index) => {
    const baseOffset = 20; // Base offset from bottom-left
    const windowWidth = 320; // Chat window width
    const spacing = 10; // Spacing between windows
    
    return {
      bottom: baseOffset,
      right: baseOffset + (index * (windowWidth + spacing))
    };
  };

  // Get total unread count
  const getTotalUnreadCount = () => {
    return Object.values(unreadMessages).filter(Boolean).length;
  };

  // Toggle friends list visibility
  const toggleFriendsList = () => {
    setShowFriendsList(prev => !prev);
  };

  const value = {
    openChats,
    unreadMessages,
    onlineFriends,
    showChatButton,
    showFriendsList,
    openChat,
    closeChat,
    toggleChatMinimize,
    markAsRead,
    getTotalUnreadCount,
    toggleFriendsList,
    setShowChatButton,
    setOnlineFriends
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
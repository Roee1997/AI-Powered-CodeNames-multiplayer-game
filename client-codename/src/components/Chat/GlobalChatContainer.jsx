import React, { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import ChatWindow from './ChatWindow';
import ChatFriendsList from './ChatFriendsList';

const GlobalChatContainer = () => {
  const { user } = useAuth();
  const { 
    openChats, 
    showFriendsList, 
    closeChat, 
    toggleChatMinimize 
  } = useChat();
  const [onlineStatus, setOnlineStatus] = useState({});

  useEffect(() => {
    if (!user?.uid) return;

    const statusRef = ref(db, "playersStatus");
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const allStatus = snapshot.val() || {};
      setOnlineStatus(allStatus);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const isOnline = (userId) => {
    const status = onlineStatus[userId];
    return status && status.online === true;
  };

  // Don't render if user is not logged in
  if (!user) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Friends List */}
      {showFriendsList && (
        <div className="fixed bottom-24 left-6 pointer-events-auto">
          <ChatFriendsList />
        </div>
      )}

      {/* Multiple Chat Windows */}
      {Array.from(openChats.values()).map((chat) => (
        <div
          key={chat.friendId}
          className="fixed pointer-events-auto transition-all duration-300 ease-in-out"
          style={{
            bottom: `${chat.position.bottom}px`,
            right: `${chat.position.right}px`,
            transform: chat.isMinimized ? 'translateY(calc(100% - 60px))' : 'translateY(0)'
          }}
        >
          <GlobalChatWindow
            chat={chat}
            onClose={() => closeChat(chat.friendId)}
            onMinimize={() => toggleChatMinimize(chat.friendId)}
            isOnline={isOnline(chat.friendId)}
          />
        </div>
      ))}
    </div>
  );
};

// Enhanced ChatWindow for global usage
const GlobalChatWindow = ({ chat, onClose, onMinimize, isOnline }) => {
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-t-lg shadow-xl border border-gray-200 overflow-hidden w-80">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="user-avatar blue text-sm">
            {chat.friendName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm truncate" title={chat.friendName}>
              {chat.friendName}
            </h3>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              {isOnline ? 'פעיל' : 'לא מחובר'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Minimize Button */}
          <button
            onClick={onMinimize}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 rounded-full transition-all duration-200"
            title={chat.isMinimized ? 'הרחב' : 'מזער'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-all duration-200"
            title="סגור צ'אט"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Content - Only show if not minimized */}
      {!chat.isMinimized && (
        <div className="h-80">
          <ChatWindow
            currentUserId={user.uid}
            friendId={chat.friendId}
            friendName={chat.friendName}
            onClose={onClose}
            isGlobal={true}
          />
        </div>
      )}
    </div>
  );
};

export default GlobalChatContainer;
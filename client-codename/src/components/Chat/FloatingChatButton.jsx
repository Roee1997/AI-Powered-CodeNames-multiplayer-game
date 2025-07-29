import React, { useCallback } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

const FloatingChatButton = () => {
  const { user } = useAuth();
  const { 
    getTotalUnreadCount, 
    toggleFriendsList, 
    showFriendsList, 
    showChatButton 
  } = useChat();

  // Move all Hook calls before any conditional logic
  const handleToggle = useCallback(() => {
    toggleFriendsList();
  }, [toggleFriendsList]);

  const unreadCount = getTotalUnreadCount();

  // Don't show if user is not logged in
  if (!user || !showChatButton) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Chat Button */}
      <button
        onClick={handleToggle}
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center relative ${
          showFriendsList
            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl'
        }`}
      >
        {/* Message Icon */}
        <svg 
          className="w-6 h-6 text-white" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Online Indicator */}
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
      </button>

      {/* Hover Tooltip */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        {showFriendsList ? 'סגור רשימת חברים' : 'פתח צ\'אט'}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
    </div>
  );
};

export default React.memo(FloatingChatButton);
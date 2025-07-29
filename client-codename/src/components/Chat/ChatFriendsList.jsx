import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { subscribeToFriendSync } from '../../services/firebaseService';
import { ref, onValue } from 'firebase/database';
import { db } from '../../../firebaseConfig';
import API_BASE from '../../config/api';

const ChatFriendsList = () => {
  const { user } = useAuth();
  const { openChat, unreadMessages, openChats } = useChat();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState({});

  useEffect(() => {
    if (!user?.uid) return;

    let isInitialLoad = true;

    const loadFriends = async () => {
      if (isInitialLoad) {
        setLoading(true);
        isInitialLoad = false;
      }
      
      try {
        const res = await fetch(`${API_BASE}/api/friends/${user.uid}`);
        if (!res.ok) throw new Error('Failed to fetch friends');
        
        const data = await res.json();
        setFriends(data);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        if (loading) {
          setLoading(false);
        }
      }
    };

    loadFriends();

    const unsubscribeSync = subscribeToFriendSync(user.uid, () => {
      loadFriends();
    });

    // Subscribe to online status
    const statusRef = ref(db, "playersStatus");
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const allStatus = snapshot.val() || {};
      setOnlineStatus(allStatus);
    });

    return () => {
      unsubscribeSync();
      unsubscribeStatus();
    };
  }, [user?.uid]);


  const handleStartChat = useCallback((friend) => {
    openChat(friend.UserID, friend.Username);
  }, [openChat]);

  const isOnline = useCallback((userId) => {
    const status = onlineStatus[userId];
    return status && status.online === true;
  }, [onlineStatus]);

  const isChatOpen = useCallback((userId) => {
    return openChats.has(userId);
  }, [openChats]);

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          רשימת חברים
        </h3>
        <p className="text-sm text-gray-600 mt-1">בחר חבר כדי להתחיל לשוחח</p>
      </div>

      {/* Friends List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2">טוען חברים...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium">אין לך חברים</p>
            <p className="text-sm">הוסף חברים מדף החברים</p>
          </div>
        ) : (
          <div className="p-2">
            {friends.map((friend) => {
              const chatIsOpen = isChatOpen(friend.UserID);
              return (
                <div
                  key={friend.UserID}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                    chatIsOpen 
                      ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleStartChat(friend)}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="user-avatar blue text-sm">
                      {friend.Username.charAt(0).toUpperCase()}
                    </div>
                    {/* Online indicator - only show if actually online */}
                    {isOnline(friend.UserID) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>

                  {/* Friend Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 truncate">
                        {friend.Username}
                      </p>
                      {unreadMessages[friend.UserID] && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {friend.Email}
                    </p>
                  </div>

                  {/* Chat Icon */}
                  <div className={`transition-colors ${chatIsOpen ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={chatIsOpen ? "M6 18L18 6M6 6l12 12" : "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"} />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          {friends.length} חברים זמינים
        </p>
      </div>
    </div>
  );
};

export default React.memo(ChatFriendsList);
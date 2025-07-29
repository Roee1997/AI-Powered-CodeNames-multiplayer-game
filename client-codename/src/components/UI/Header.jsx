import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ref, onValue } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { subscribeToFriendRequestAlerts, clearFriendRequestAlert } from "../../services/firebaseService";
import { showToast } from "../../services/toastService";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Removed hasUnreadMessages state - now handled by global chat
  const [hasFriendRequestAlert, setHasFriendRequestAlert] = useState(false);
  const shownNotifications = useRef(new Set());
  
  // Get or create session storage key for this user
  const getNotificationKey = (type, senderId = '') => {
    return `notification_${user?.uid}_${type}_${senderId}_${Date.now().toString().slice(0, -5)}`; // 5-minute window
  };
  
  const hasBeenShown = (key) => {
    return shownNotifications.current.has(key) || sessionStorage.getItem(key) === 'shown';
  };
  
  const markAsShown = (key) => {
    shownNotifications.current.add(key);
    sessionStorage.setItem(key, 'shown');
  };

  useEffect(() => {
    if (!user?.uid) return;

    // Message notifications are now handled by global chat system
    // Keep only the toast notification for new messages
    const unreadRef = ref(db, `unreadMessages/${user.uid}`);
    let previousUnread = {};

    const unsubscribeMessages = onValue(unreadRef, (snapshot) => {
      const data = snapshot.val() || {};

      const newSender = Object.entries(data).find(
        ([senderId, val]) => val === true && !previousUnread[senderId]
      );

      if (newSender) {
        const [senderId] = newSender;
        const notificationKey = getNotificationKey('message', senderId);
        
        if (!hasBeenShown(notificationKey)) {
          showToast("קיבלת הודעה חדשה!", "info");
          markAsShown(notificationKey);
        }
      }

      previousUnread = data;
    });

    const unsubscribeFriendAlert = subscribeToFriendRequestAlerts(user.uid, (hasAlert) => {
      setHasFriendRequestAlert(hasAlert);
      if (hasAlert) {
        const notificationKey = getNotificationKey('friend_request');
        
        if (!hasBeenShown(notificationKey)) {
          showToast("קיבלת בקשת חברות חדשה!", "info");
          markAsShown(notificationKey);
        }
        
        setTimeout(() => {
          clearFriendRequestAlert(user.uid);
        }, 3000);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeFriendAlert();
    };
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await logout();
      showToast("התנתקת מהמערכת", "info");
      navigate("/");
    } catch (error) {
      console.error("שגיאה בהתנתקות:", error);
      showToast("שגיאה בעת התנתקות", "error");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800 text-white py-4 max-ml:py-3 px-4 max-ml:px-3 md:px-6 flex justify-between items-center shadow-2xl border-b border-slate-700">
      <div className="text-2xl max-ml:text-xl md:text-3xl font-bold">
        <Link className="text-white hover:text-cyan-400 transition-all duration-300">
          Codenames
        </Link>
      </div>

      <nav className="hidden md:flex gap-8 max-ml:gap-3 lg:gap-12" dir="rtl">
        {user && (
          <>
            <Link to="/lobby" className="px-6 max-ml:px-3 py-2.5 max-ml:py-1.5 rounded-xl max-ml:rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-300 font-medium max-ml:text-xs hover:scale-105 hover:shadow-lg backdrop-blur-sm">
              <span className="max-ml:hidden">🎯 משחק</span>
              <span className="hidden max-ml:inline">🎯</span>
            </Link>
            <Link to="/stats" className="px-6 max-ml:px-3 py-2.5 max-ml:py-1.5 rounded-xl max-ml:rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-300 font-medium max-ml:text-xs hover:scale-105 hover:shadow-lg backdrop-blur-sm">
              <span className="max-ml:hidden">📊 סטטיסטיקות</span>
              <span className="hidden max-ml:inline">📊</span>
            </Link>
          </>
        )}
        <Link to="/friends" className="relative px-6 max-ml:px-3 py-2.5 max-ml:py-1.5 rounded-xl max-ml:rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-300 font-medium max-ml:text-xs hover:scale-105 hover:shadow-lg backdrop-blur-sm">
          <span className="max-ml:hidden">👥 חברים</span>
          <span className="hidden max-ml:inline">👥</span>
          {hasFriendRequestAlert && (
            <span className="absolute -top-1 -right-1 w-4 h-4 max-ml:w-3 max-ml:h-3 bg-red-500 rounded-full animate-pulse border-2 max-ml:border border-white flex items-center justify-center">
              <span className="w-2 h-2 max-ml:w-1.5 max-ml:h-1.5 bg-white rounded-full"></span>
            </span>
          )}
        </Link>
        <Link to="/rules" className="px-6 max-ml:px-3 py-2.5 max-ml:py-1.5 rounded-xl max-ml:rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 transition-all duration-300 font-medium max-ml:text-xs hover:scale-105 hover:shadow-lg backdrop-blur-sm">
          <span className="max-ml:hidden">📖 חוקים</span>
          <span className="hidden max-ml:inline">📖</span>
        </Link>
      </nav>

      {user ? (
        <div className="flex items-center gap-4 max-ml:gap-3 bg-gradient-to-r from-white/10 to-white/5 px-5 max-ml:px-3 py-3 max-ml:py-2 rounded-xl border border-white/20 backdrop-blur-sm shadow-lg">
          <div className="text-sm max-ml:text-xs text-right">
            <div className="text-gray-300 text-xs">ברוך הבא</div>
            <div className="font-bold text-white text-base max-ml:text-sm">{user.displayName || user.email}</div>
          </div>
          <button onClick={handleLogout} className="px-4 max-ml:px-3 py-2 max-ml:py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all duration-300 text-white font-medium max-ml:text-sm hover:scale-105 hover:shadow-lg">
            🚪 התנתקות
          </button>
        </div>
      ) : (
        <Link
          to="/login"
          onClick={() => showToast("התחבר למערכת", "info")}
          className="px-6 max-ml:px-4 py-3 max-ml:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl transition-all duration-300 font-medium max-ml:text-sm hover:scale-105 hover:shadow-lg backdrop-blur-sm border border-white/20"
        >
          🔐 התחברות
        </Link>
      )}

    </header>
  );
};

export default Header;

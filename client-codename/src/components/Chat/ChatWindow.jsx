import React, { useEffect, useState, useRef } from "react";
import { db } from "../../../firebaseConfig";
import { ref, push, onValue, set, remove } from "firebase/database";

const ChatWindow = ({ currentUserId, friendId, friendName, onClose, isGlobal = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const chatId =
    currentUserId < friendId
      ? `${currentUserId}_${friendId}`
      : `${friendId}_${currentUserId}`;

  const messagesRef = ref(db, `chats/${chatId}/messages`);
  const metaRef = ref(db, `chats/${chatId}/meta`);

  useEffect(() => {
    // Clear messages when switching chats
    setMessages([]);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const msgList = data ? Object.values(data).sort((a, b) => a.timestamp - b.timestamp) : [];
      setMessages(msgList);
      // Scroll to bottom after messages are set (within chat container only)
      setTimeout(() => {
        if (messagesEndRef.current && messagesEndRef.current.parentElement) {
          const chatContainer = messagesEndRef.current.parentElement;
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [friendId, currentUserId]); // Add friendId dependency

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        if (messagesEndRef.current && messagesEndRef.current.parentElement) {
          const chatContainer = messagesEndRef.current.parentElement;
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

  useEffect(() => {
    const now = Date.now();
    const unsub = onValue(metaRef, (snapshot) => {
      const meta = snapshot.val();
      if (meta && meta.lastMessageTime && now - meta.lastMessageTime > 12 * 60 * 60 * 1000) {
        remove(ref(db, `chats/${chatId}`));
      }
    });

    // ניקוי התראה מהודעות שלא נקראו
    const unreadRef = ref(db, `unreadMessages/${currentUserId}/${friendId}`);
    remove(unreadRef);

    // Auto-focus input when chat opens or switches
    if (inputRef.current) {
      inputRef.current.focus();
    }

    return () => unsub();
  }, [friendId, currentUserId, chatId]); // Add dependencies

  const handleSendMessage = async () => {
    if (newMessage.trim() === "") return;

    const message = {
      sender: currentUserId,
      content: newMessage.trim(),
      timestamp: Date.now()
    };

    await push(messagesRef, message);
    await set(metaRef, { lastMessageTime: Date.now() });

    const notifyRef = ref(db, `unreadMessages/${friendId}/${currentUserId}`);
    await set(notifyRef, true);

    setNewMessage("");
    
    // Scroll to bottom after sending message (within chat container only)
    setTimeout(() => {
      if (messagesEndRef.current && messagesEndRef.current.parentElement) {
        const chatContainer = messagesEndRef.current.parentElement;
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  };

  // If this is a global chat, don't render the container (handled by GlobalChatContainer)
  if (isGlobal) {
    return (
      <div className="h-full flex flex-col" dir="rtl">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-3 bg-white">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 flex ${
                msg.sender === currentUserId ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`inline-block px-3 py-2 rounded-lg max-w-xs shadow-sm ${
                  msg.sender === currentUserId
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800"
                }`}
              >
                <div className="text-sm">{msg.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>
        
        {/* Input area */}
        <div className="bg-gray-50 p-3 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id={`chat-input-${chatId}`}
              name="message"
              type="text"
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="כתוב הודעה..."
              autocomplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-sm"
            >
              שלח
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Legacy standalone chat window
  return (
    <div className="fixed bottom-4 left-4 w-80 z-50" dir="rtl">
      {/* Main chat container with friend-card styling */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header with friend-card styling */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="user-avatar blue text-sm">
              {friendName.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-bold text-lg text-gray-800 truncate" title={friendName}>
              שיחה עם {friendName}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-all duration-200"
          >
            ✕
          </button>
        </div>
        {/* Messages area */}
        <div className="h-64 overflow-y-auto p-3 bg-white">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-2 flex ${
                msg.sender === currentUserId ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`inline-block px-3 py-2 rounded-lg max-w-xs shadow-sm ${
                  msg.sender === currentUserId
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                    : "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800"
                }`}
              >
                <div className="text-sm">{msg.content}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef}></div>
        </div>
        
        {/* Input area */}
        <div className="bg-gray-50 p-3 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              id={`chat-input-${chatId}`}
              name="message"
              type="text"
              className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="כתוב הודעה..."
              autocomplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-sm"
            >
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

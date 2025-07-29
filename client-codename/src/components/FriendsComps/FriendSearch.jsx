import React, { useState } from "react";
import FriendAddRequest from "./FriendAddRequest";
import { showToast } from "../../services/toastService";
import API_BASE from "../../config/api";

const FriendSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const handleSearch = async () => {
    setSearchResult(null);

    const endpoint = `${API_BASE}/api/friends/search?query=${searchTerm.trim()}`;
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("User not found");

      const user = await res.json();
      setSearchResult(user);
      showToast("משתמש נמצא!", "success");
    } catch (error) {
      console.error("שגיאה בחיפוש:", error.message);
      showToast("המשתמש לא נמצא.", "error");
    }
  };

  return (
    <div dir="rtl">
      <div className="friend-search-bar">
        <input
          type="text"
          placeholder="חפש לפי שם משתמש או אימייל"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-black placeholder:text-gray-500 w-full"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          className="btn-primary"
        >
          חיפוש
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {searchResult && (
          <div className="friend-card bg-white bg-opacity-95 flex justify-between items-center">
            <div className="flex items-center">
              <div className="user-avatar blue">
                {searchResult.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-lg font-semibold text-gray-800">{searchResult.username}</span>
                <p className="text-sm text-gray-600">{searchResult.email}</p>
              </div>
            </div>
            <FriendAddRequest receiverUser={searchResult} />
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendSearch;

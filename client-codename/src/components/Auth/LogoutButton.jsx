import React from "react";
import { useAuth } from "../../context/AuthContext";

const LogoutButton = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    console.log("🔴 כפתור ההתנתקות נלחץ!");
    logout();
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-300"
    >
      התנתק
    </button>
  );
};

export default LogoutButton;
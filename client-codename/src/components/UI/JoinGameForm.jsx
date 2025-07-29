import React from "react";

const JoinGameForm = ({ gameIdInput, setGameIdInput, onJoin }) => {
  return (
    <div className="bg-white/30 backdrop-blur-md p-6 max-ml:p-4 rounded-2xl shadow-xl text-center space-y-4 max-ml:space-y-3 w-full max-w-md max-ml:max-w-sm border border-white/50">
      <h2 className="text-xl max-ml:text-lg font-extrabold text-white drop-shadow">הצטרף למשחק קיים</h2>

      <input
        type="text"
        placeholder="הכנס קוד משחק"
        value={gameIdInput}
        onChange={(e) => setGameIdInput(e.target.value)}
        className="w-full px-4 max-ml:px-3 py-2 max-ml:py-1.5 text-center bg-white/70 text-gray-800 placeholder-gray-500 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-base max-ml:text-sm"
      />

      <button
        onClick={onJoin}
        className="w-full py-2 max-ml:py-1.5 bg-gradient-to-r from-indigo-400 to-blue-500 text-white font-semibold rounded-xl shadow-lg hover:from-indigo-500 hover:to-blue-600 transition-all text-base max-ml:text-sm"
      >
        הצטרף למשחק
      </button>
    </div>
  );
};

export default JoinGameForm;
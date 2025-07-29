import React from 'react';
import { Link } from 'react-router-dom';

const LoginButtons = () => {
  return (
    <div className="flex flex-col items-center space-y-4 mt-8">
      <Link
        to="/login"
        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-5 px-14 rounded-full font-semibold text-2xl shadow-lg transform hover:bg-gradient-to-l hover:from-orange-500 hover:to-yellow-500 hover:scale-110 transition-all"
      >
        התחברות
      </Link>
      <p className="text-white text-sm mt-2">
        אם לא נרשמתה, <Link to="/register" className="text-yellow-400 underline">הירשם כאן</Link>
      </p>
    </div>
  );
};

export default LoginButtons;
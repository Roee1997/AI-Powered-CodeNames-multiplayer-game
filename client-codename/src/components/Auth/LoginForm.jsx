import React, { useState } from 'react';
import { loginUser } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { showToast } from '../../services/toastService';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await loginUser(email, password);
      console.log('✅ התחברות מוצלחת:', user);
      showToast('התחברת בהצלחה! מעביר אותך ללובי...', 'success');
      setTimeout(() => navigate('/Lobby'), 1500);
    } catch (error) {
      console.error("❌ שגיאה בהתחברות:", error.code);
      switch (error.code) {
        case "auth/wrong-password":
          showToast("סיסמה שגויה. נסה שוב.", "error");
          break;
        case "auth/user-not-found":
          showToast("המשתמש לא קיים.", "error");
          break;
        case "auth/invalid-credential":
          showToast("אימייל או סיסמה שגויים.", "error");
          break;
        case "auth/too-many-requests":
          showToast("נראה שעשית יותר מדי ניסיונות. נסה שוב מאוחר יותר.", "error");
          break;
        default:
          showToast("שגיאה בהתחברות. נסה שוב מאוחר יותר.", "error");
      }
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="relative z-10 bg-gradient-to-r from-gray-800 via-gray-900 to-black p-8 rounded-xl shadow-2xl w-96 mx-auto mt-12">
        <h2 className="text-3xl font-bold text-center mb-6 text-white drop-shadow-md">התחברות</h2>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2" htmlFor="email">אימייל</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autocomplete="email"
              required
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 font-medium mb-2" htmlFor="password">סיסמה</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autocomplete="current-password"
              required
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:bg-gradient-to-l hover:from-orange-500 hover:to-yellow-500 disabled:bg-gray-500"
          >
            {loading ? "מתחבר..." : "התחבר"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          לא רשום עדיין? <Link to="/register" className="text-yellow-400 font-semibold hover:underline">הרשם כאן</Link>
        </p>
        <p className="text-center text-sm text-gray-400 mt-2">
          <Link to="/forgot-password" className="text-blue-300 hover:underline">
            שכחתי סיסמה
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;

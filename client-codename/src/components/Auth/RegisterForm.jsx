import React, { useState } from "react";
import { registerUser } from "../../services/authService"; 
import { Link, useNavigate } from "react-router-dom"; 
import { showToast } from "../../services/toastService";
import "../../css/auth.css"; 

const RegisterForm = () => {
  const [username, setUsername] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); 

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await registerUser(username, email, password);
      console.log("✅ User registered successfully:", user);
      showToast("נרשמת בהצלחה! מעביר ללובי...", "success");
      setTimeout(() => navigate("/Lobby"), 1500);

    } catch (error) {
      console.error("❌ Registration error:", error.message);

      if (error.message.includes("כינוי כבר קיים")) {
        showToast("הכינוי כבר קיים במערכת. נסה כינוי אחר.", "error");
      } else if (error.message.includes("האימייל כבר קיים")) {
        showToast("האימייל כבר קיים במערכת. נסה להתחבר.", "error");
      } else {
        showToast("שגיאה בהרשמה. נסה שוב מאוחר יותר.", "error");
      }
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="relative z-10 bg-gradient-to-r from-gray-800 via-gray-900 to-black p-8 rounded-xl shadow-2xl w-96 mx-auto mt-12">
        <h2 className="text-3xl font-bold text-center mb-6 text-white drop-shadow-md">הרשמה</h2>

        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2" htmlFor="register-username">כינוי</label>
            <input
              id="register-username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autocomplete="username"
              required
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 font-medium mb-2" htmlFor="register-email">אימייל</label>
            <input
              id="register-email"
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
            <label className="block text-gray-300 font-medium mb-2" htmlFor="register-password">סיסמה</label>
            <input
              id="register-password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autocomplete="new-password"
              required
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
            />
          </div>

          <button type="submit" disabled={loading} dir="rtl" className="w-full py-3 bg-yellow-500 text-white font-semibold rounded-lg shadow-lg ">
            {loading ? "נרשם..." : "הירשם"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          כבר יש לך חשבון? <Link to="/login" className="text-yellow-400 font-semibold hover:underline">התחבר כאן</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;

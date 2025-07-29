import React, { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import BackgroundImage from "../components/UI/BackgroundImage";
import Footer from "../components/UI/Footer";
import MainHeadLine from "../components/UI/MainHeadLine";
import codenamesImage from "../assets/codename.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("📧 נשלח מייל לאיפוס סיסמה! בדוק את תיבת הדואר שלך.");
    } catch (error) {
      console.error("שגיאה באיפוס:", error);
      setMessage("❌ לא הצלחנו לשלוח מייל. ודא שהאימייל תקין או רשום במערכת.");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* רקע */}
      <BackgroundImage image={codenamesImage} />

      {/* תוכן */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow py-8 px-4">
        <MainHeadLine />
        <div className="bg-black bg-opacity-70 p-6 rounded-lg shadow-lg w-full max-w-md text-white">
          <h2 className="text-2xl font-bold mb-4 text-center">🔑 איפוס סיסמה</h2>
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input
              type="email"
              placeholder="הכנס את כתובת האימייל שלך"
              className="p-2 rounded border text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
            >
              שלח קישור לאיפוס
            </button>
          </form>
          {message && <p className="mt-4 text-sm text-center">{message}</p>}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-blue-300 hover:underline">
              חזור להתחברות
            </Link>
          </div>
        </div>
      </div>

      {/* פוטר */}
      <Footer className="mt-auto" />
    </div>
  );
};

export default ForgotPassword;

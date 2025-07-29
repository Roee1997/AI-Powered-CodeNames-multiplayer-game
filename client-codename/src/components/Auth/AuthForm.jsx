import React from 'react';
///בדיקה בדיקה /// 
const AuthForm = ({ onSubmit, buttonText, email, setEmail, password, setPassword }) => {
  const handleSubmit = (e) => {
    e.preventDefault();  // מונע רענון אוטומטי של הדף בעת שליחת הטופס
    onSubmit(e);  // שולח את האירוע לפונקציה onSubmit (שהיא handleLogin)
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}  // עדכון ה-email
          required
        />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}  // עדכון ה-password
          required
        />
      </div>
      <button type="submit">{buttonText}</button>  {/* כפתור התחברות/הרשמה */}
    </form>
  );
};

export default AuthForm;  // יצוא ברירת מחדל
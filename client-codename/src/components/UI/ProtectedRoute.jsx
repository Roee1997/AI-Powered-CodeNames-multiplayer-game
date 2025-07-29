import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  console.log('משתמש ב- ProtectedRoute:', user);  // הוספת console.log לבדוק את הערך

  if (loading) {
    // אם המשתמש עדיין בטעינה, נחכה
    return <p>אנא המתן...</p>;
  }

  return user ? <Outlet /> : <Navigate to="/home" />;
};

export default ProtectedRoute;
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../../firebaseConfig"; // ייבוא auth מ-firebaseConfig
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, onValue, set } from "firebase/database";
import { toast } from "react-toastify";
import GameInvitationToast from "../components/Chat/GameInvitationToast";

// יצירת הקונטקסט
const AuthContext = createContext();

// ספק (Provider) שמנהל את המשתמש המחובר
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // מאזין לשינויים במשתמש המחובר
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe(); // הפסקת ההאזנה ביציאה
  }, []);

  // Global invitation listener
  useEffect(() => {
    if (!user?.uid) return;

    const invitationsRef = ref(db, `invitations/${user.uid}`);
    const unsubscribe = onValue(invitationsRef, (snapshot) => {
      const invitation = snapshot.val();
      if (invitation?.gameId) {
        const sender = invitation.fromName || "שחקן אלמוני";

        // Clear old invitation and show new one
        set(ref(db, `invitations/${user.uid}`), null);

        toast(({ closeToast }) => (
          <GameInvitationToast
            userId={user.uid}
            invitation={invitation}
            closeToast={closeToast}
          />
        ), {
          position: "top-center",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          closeButton: true,
          toastId: `invitation-${invitation.gameId}` // Prevent duplicate toasts
        });
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // פונקציה ליציאה מהחשבון
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// שימוש ב-hook לגישה מהירה למידע על המשתמש
export const useAuth = () => useContext(AuthContext);
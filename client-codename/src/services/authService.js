import { auth } from "../../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import API_BASE from "../config/api";

const API_BASE_URL = `${API_BASE}/api/users`;// ✅ Adjust if needed

// 🔹 Register User (Check Username, Register in Firebase, Update displayName, Register in SQL)
export async function registerUser(username, email, password) {
  try {
    // 🔹 Step 1: Check if the Username is available in SQL Server
    const usernameCheckResponse = await fetch(`${API_BASE_URL}/check-username/${username}`);

    if (!usernameCheckResponse.ok) {
      const errorData = await usernameCheckResponse.json();
      throw new Error(errorData.message || "⚠️ הכינוי כבר תפוס, בחר כינוי אחר.");
    }

    // 🔹 Step 2: Register the user in Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("✅ Firebase user created:", user.uid);

    // ✅ Step 3: Update display name in Firebase
    await updateProfile(user, {
      displayName: username
    });
    console.log("✅ Display name set to:", username);

    // 🔹 Step 4: Send user data to SQL Server
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserID: user.uid,
        Username: username,
        Email: email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // 🔥 Step 5: If SQL registration fails, delete the Firebase user
      await deleteUser(user);
      throw new Error(errorData.message || "❌ Failed to register user in SQL Server.");
    }

    console.log("✅ User registered in SQL Server!");
    return user;

  } catch (error) {
    console.error("❌ Registration error:", error.message);

    // 🔥 Step 6: If Firebase created the user but SQL failed, delete the user
    if (auth.currentUser) {
      await deleteUser(auth.currentUser);
      console.log("🔥 Firebase user deleted due to SQL error.");
    }

    // 🔹 Handle Firebase "Email Already in Use" Error
    if (error.code === "auth/email-already-in-use") {
      throw new Error("⚠️ האימייל כבר קיים במערכת. נסה להתחבר.");
    }

    if (error.message.includes("כינוי כבר קיים")) {
      throw new Error("⚠️ הכינוי כבר קיים במערכת. נסה כינוי אחר.");
    }

    throw error;
  }
}
// 🔹 Login User
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase auth error:", error);
    throw error;
  }
};

// 🔹 Logout User
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
  }
};

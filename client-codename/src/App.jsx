import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/UI/ProtectedRoute";
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import './css/App.css';
import GlobalChatContainer from './components/Chat/GlobalChatContainer';
import FloatingChatButton from './components/Chat/FloatingChatButton';
import Friends from "./pages/Friends";
import Game from "./pages/Game";
import GameLobby from "./pages/GameLobby.jsx";
import Home from "./pages/Home";
import LobbyPage from "./pages/Lobby";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Rules from "./pages/Rules";
import { ToastContainer } from "react-toastify";
import PlayerStats from "./pages/PlayerStats";
import "react-toastify/dist/ReactToastify.css";
import ForgotPassword from './pages/ForgotPassword';
import { AudioSettingsButton } from './components/Sound/AudioSettings';
import GlobalSoundEffects from './components/Sound/GlobalSoundEffects';
import { useEffect } from 'react';
import { preloadAllSounds } from './services/soundService'; 




function App() {
  // Preload all sounds when app starts
  useEffect(() => {
    preloadAllSounds();
  }, []);

  return (
    <AuthProvider> {/* עטוף את כל האפליקציה ב-AuthProvider */}
      <ChatProvider> {/* עטוף את כל האפליקציה ב-ChatProvider */}
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} /> {/* 👈 הוספה */}
            
            <Route element={<ProtectedRoute />}>
              <Route path="/lobby" element={<LobbyPage />} />
              <Route path="/game/:gameId" element={<Game />} /> {/* ✅ תיקון כאן */}
              <Route path="/game-lobby/:gameId" element={<GameLobby />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/stats" element={<PlayerStats />} />

            </Route>

            <Route path="*" element={<Home />} />
          </Routes>
          <ToastContainer
          position="top-right"
          autoClose={2500}
          rtl={true}
          pauseOnFocusLoss={false}
        />
        </div>
        
        {/* Global Chat Components */}
        <GlobalChatContainer />
        <FloatingChatButton />
        
        {/* Audio Settings Button */}
        <AudioSettingsButton />
        
        {/* Global Sound Effects for all buttons */}
        <GlobalSoundEffects />
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;
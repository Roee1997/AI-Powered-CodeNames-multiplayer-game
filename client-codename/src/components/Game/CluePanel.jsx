// ... ייבוא קבועים ...
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { db } from "../../../firebaseConfig";
import API_BASE from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { sendClueToFirebase, setLastClue } from "../../services/firebaseService";
import CluePredictor from "./CluePredictor";
import { useSound } from "../../hooks/useSound";
// Removed: import "../css/CluePanel.css";

const CluePanel = ({ team, gameId, currentTurn, boardWords, turnId, boardCards }) => {
  const [word, setWord] = useState("");
  const [number, setNumber] = useState("");
  const [lastClue, setLastClueState] = useState(null);
  const [turnStart, setTurnStart] = useState(null);
  const [gameType, setGameType] = useState("classic");
  
  // Enhanced race condition protection for turn transitions
  const [lastTurnId, setLastTurnId] = useState(null);
  const [lastCurrentTurn, setLastCurrentTurn] = useState(null);
  const [isInTransition, setIsInTransition] = useState(false);
  
  const { user } = useAuth();
  const sound = useSound();

  // Enhanced turn transition detection - monitors both turnId and currentTurn
  useEffect(() => {
    const turnIdChanged = turnId !== lastTurnId && lastTurnId !== null;
    const currentTurnChanged = currentTurn !== lastCurrentTurn && lastCurrentTurn !== null;
    
    if (turnIdChanged || currentTurnChanged) {
      // Turn is changing (not initial load) - enter transition state
      setIsInTransition(true);
      
      // Clear lastClue immediately to prevent stale data
      setLastClueState(null);
      
      // Extended debounce to allow all Firebase listeners to sync
      const transitionTimer = setTimeout(() => {
        setIsInTransition(false);
      }, 500); // Increased to 500ms for better reliability
      
      return () => clearTimeout(transitionTimer);
    }
    
    // Update tracking variables for next comparison
    if (turnId !== lastTurnId) {
      setLastTurnId(turnId);
    }
    if (currentTurn !== lastCurrentTurn) {
      setLastCurrentTurn(currentTurn);
    }
  }, [turnId, lastTurnId, currentTurn, lastCurrentTurn]);

  useEffect(() => {
    if (!gameId || !turnId) return;

    const clueRef = ref(db, `games/${gameId}/lastClues/${turnId}`);
    const unsubClue = onValue(clueRef, (snap) => setLastClueState(snap.val()));

    const turnStartRef = ref(db, `games/${gameId}/turnStart`);
    const unsubStart = onValue(turnStartRef, (snap) => setTurnStart(snap.val()));

    const gameTypeRef = ref(db, `games/${gameId}/settings/gameType`);
    const unsubGameType = onValue(gameTypeRef, (snap) => {
      if (snap.exists()) setGameType(snap.val());
    });

    return () => {
      unsubClue();
      unsubStart();
      unsubGameType();
    };
  }, [gameId, turnId]);

  const handleSend = async () => {
    const trimmedWord = word.trim().toLowerCase();

    if (!trimmedWord || !number) {
      sound.clueError();
      toast.warn("יש למלא גם מילה וגם מספר");
      return;
    }

    if (trimmedWord.includes(" ")) {
      sound.clueError();
      toast.warn("מותר להזין רק מילה אחת – בלי רווחים או צירופים");
      return;
    }

    if (gameType === "classic") {
      const hebrewOnlyRegex = /^[\u0590-\u05FF]+$/;
      if (!hebrewOnlyRegex.test(trimmedWord)) {
        sound.clueError();
        toast.warn("הרמז חייב להכיל אותיות בעברית בלבד – ללא מספרים, אנגלית או סימנים");
        return;
      }
    } else if (gameType === "scientific") {
      const englishOnlyRegex = /^[a-zA-Z]+$/;
      console.log("🔍 בדיקת מילה באנגלית:", trimmedWord);
      if (!englishOnlyRegex.test(trimmedWord)) {
        console.warn("🚫 מילה לא חוקית באנגלית:", trimmedWord);
        sound.clueError();
        toast.warn("In scientific mode, the clue must contain English letters only.");
        return;
      }
    }

    const num = parseInt(number);
    if (isNaN(num) || num < 1 || num > 8) {
      sound.clueError();
      toast.warn("יש לבחור מספר בין 1 ל-8");
      return;
    }

    const isInvalidClue = boardWords?.some((boardWord) => {
      const b = boardWord.trim().toLowerCase();
      return b === trimmedWord || b.includes(trimmedWord) || trimmedWord.includes(b);
    });

    if (isInvalidClue) {
      sound.clueError();
      toast.error("🚫 הרמז לא חוקי – המילה או גרסה שלה כבר מופיעה בלוח");
      return;
    }

    if (lastClue) {
      sound.clueError();
      toast.warn("כבר נשלח רמז בתור הזה");
      return;
    }

    // Play clue submission sound
    sound.clueSubmit();

    const clue = {
      word: trimmedWord,
      number: num,
      team,
      giverName: user?.displayName || "לוחש אלמוני",
      timestamp: Date.now(), // ⬅️ הוספת שדה זמן
    };

    await sendClueToFirebase(gameId, clue);
    await setLastClue(gameId, turnId, clue);
    console.log("📤 רמז נשלח ל־Firebase:", clue);

    try {
      if (!turnId || !turnStart) {
        toast.error("❌ שגיאה: חסר מידע קריטי (TurnID או turnStart)");
        return;
      }

      const durationInSeconds = Math.floor((Date.now() - turnStart) / 1000);

      const res = await fetch(`${API_BASE}/api/clues/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameID: gameId,
          turnID: turnId,
          userID: user?.uid || "unknown",
          team,
          clueWord: trimmedWord,
          clueNumber: num,
          durationInSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "שגיאה בשמירת רמז");
      
      // Play success sound and show toast
      sound.clueSuccess();
      toast.success("💾 הרמז נשמר בהצלחה ב־SQL");
    } catch (err) {
      console.error("❌ שגיאה בשמירת רמז לשרת:", err);
      toast.error("❌ שגיאה בשמירת רמז לשרת");
    }

    setWord("");
    setNumber("");
  };

  // Show transition state to prevent panel flash during turn changes
  if (isInTransition) {
    return <div style={{fontSize:12, color:'#888', textAlign:'center', padding:'2px 0'}}>⏳ מעבר תור...</div>;
  }

  if (team !== currentTurn) {
    return <div style={{fontSize:12, color:'#888', textAlign:'center', padding:'2px 0'}}>⏳ ממתין לתור הקבוצה שלך...</div>;
  }

  if (lastClue && lastClue.team === team) {
    return <div style={{fontSize:12, color:'#888', textAlign:'center', padding:'2px 0'}}>🕵️ שלחת רמז – ממתין לסיום התור...</div>;
  }

  // Additional validation: ensure turnId and currentTurn are properly aligned
  // This prevents showing the panel during race conditions when one updates before the other
  if (turnId && currentTurn && team === currentTurn) {
    // Verify we have all required data before showing input form
    if (!turnStart && !isInTransition) {
      return <div style={{fontSize:12, color:'#888', textAlign:'center', padding:'2px 0'}}>⏳ טוען נתוני תור...</div>;
    }
  }

  // Minimal, single-row, compact panel
  return (
    <div
      style={{
        minHeight: 40,
        maxHeight: 50,
        width: '100%',
        margin: '12px auto',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        border: `2px solid ${team === "Red" ? '#ef4444' : '#3b82f6'}`,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.95)',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.1)',
        gap: 8,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <span style={{width:10,height:10,borderRadius:5,background:team==="Red"?'#ef4444':'#3b82f6',display:'inline-block'}}></span>
      <span style={{fontWeight:700,color:'#333',fontSize:14}}>🎭 פאנל הלוחש</span>
      <form style={{display:'flex',alignItems:'center',gap:8,margin:0,padding:0}} onSubmit={e=>{e.preventDefault();handleSend();}}>
        <input
          id="clue-word-input"
          name="clueWord"
          type="text"
          placeholder="הקלד רמז..."
          value={word}
          onChange={e=>setWord(e.target.value)}
          autocomplete="off"
          style={{width:140,minWidth:0,border:'2px solid #ddd',padding:'6px 10px',borderRadius:8,fontSize:14,background:'#fff',color:'#222',fontWeight:500}}
        />
        <select
          id="clue-number-select"
          name="clueNumber"
          value={number}
          onChange={e=>setNumber(e.target.value)}
          autocomplete="off"
          style={{width:65,border:'2px solid #ddd',padding:'6px 4px',borderRadius:8,fontSize:14,background:'#fff',color:'#222',fontWeight:500}}
        >
          <option value="">מספר</option>
          {[...Array(8)].map((_,i)=>(<option key={i+1} value={i+1}>{i+1}</option>))}
        </select>
        <button
          type="submit"
          style={{background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,padding:'6px 16px',fontWeight:700,fontSize:14,cursor:'pointer',height:36,transition:'background 0.2s',boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}
          onMouseOver={e=>e.currentTarget.style.background='#2563eb'}
          onMouseOut={e=>e.currentTarget.style.background='#3b82f6'}
        >
          🚀 שלח רמז
        </button>
      </form>
      
      {/* רכיב הניתוח בזמן אמת */}
      <CluePredictor 
        clueWord={word}
        boardCards={boardCards}
        currentTeam={team}
        gameType={gameType}
      />
    </div>
  );
};

export default CluePanel;

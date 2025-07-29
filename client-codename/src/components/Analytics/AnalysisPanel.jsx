import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../../firebaseConfig";
import WordEmbeddingChart from "./WordEmbeddingChart";

const AnalysisPanel = ({ gameId, onClose }) => {
  const [turnIds, setTurnIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [data, setData] = useState(null);
  const [lastTurnId, setLastTurnId] = useState(null);

  useEffect(() => {
    const analysisRef = ref(db, `games/${gameId}/analysis`);
    return onValue(analysisRef, (snapshot) => {
      const all = snapshot.val();
      console.log("Analysis data from Firebase:", all);
      if (all) {
        const ids = Object.keys(all).sort((a, b) => parseInt(b) - parseInt(a)); // Sort in descending order
        console.log("Turn IDs found:", ids);
        setTurnIds(ids);
        // Set the last turn ID when data is loaded
        if (!lastTurnId) {
          setLastTurnId(ids[0]);
          setCurrentIndex(0);
        }
      } else {
        console.log("No analysis data found for gameId:", gameId);
      }
    });
  }, [gameId, lastTurnId]);

  useEffect(() => {
    if (!turnIds.length) return;
    const turnId = turnIds[currentIndex];
    console.log("Loading data for turnId:", turnId);
    const dataRef = ref(db, `games/${gameId}/analysis/${turnId}`);
    return onValue(dataRef, (snapshot) => {
      const d = snapshot.val();
      console.log("Turn data received:", d);
      if (d) setData({ ...d, turnId });
    });
  }, [turnIds, currentIndex, gameId]);

  const prev = () => setCurrentIndex((i) => Math.min(i + 1, turnIds.length - 1));
  const next = () => setCurrentIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 max-w-6xl w-full relative shadow-lg overflow-y-auto max-h-[95vh]">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 text-xl hover:text-red-600 transition"
        >
          ✖
        </button>

        {data && (
          <>
            {/* כותרת ראשית עם ניווט תורים */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={prev}
                disabled={currentIndex >= turnIds.length - 1}
                className={`px-4 py-2 rounded font-bold text-sm ${
                  currentIndex >= turnIds.length - 1
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                ⬅ תור קודם
              </button>

              <div className="text-gray-600">
                תור {turnIds.length - currentIndex} מתוך {turnIds.length}
              </div>

              <button
                onClick={next}
                disabled={currentIndex <= 0}
                className={`px-4 py-2 rounded font-bold text-sm ${
                  currentIndex <= 0
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                תור הבא ➡
              </button>
            </div>

            {/* גרף + טבלה */}
            <WordEmbeddingChart 
              vectors={data.vectors} 
              clue={data.clue} 
              turnId={data.turnId}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;

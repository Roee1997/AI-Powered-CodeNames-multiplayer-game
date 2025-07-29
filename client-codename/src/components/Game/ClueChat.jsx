import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribeToGuessMessages } from "../../services/firebaseService";

const ClueChat = ({ clues, gameId }) => {
  const { user } = useAuth();
  const [guesses, setGuesses] = useState([]);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  useEffect(() => {
    const unsub = subscribeToGuessMessages(gameId, (msgs) => {
      setGuesses(msgs);
    });
    return () => unsub();
  }, [gameId]);

  const combined = [...clues, ...guesses].sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );

  // Smart auto-scroll: only scroll when user is at bottom
  useEffect(() => {
    if (!isUserScrolledUp) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [combined, isUserScrolledUp]);

  // Track user scroll position
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    setIsUserScrolledUp(!isAtBottom);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="rounded-lg shadow-inner text-right bg-white/90 text-black max-w-[28rem] max-ml:max-w-[24rem] w-full mx-auto flex flex-col"
      style={{
        height: "400px",
        overflowY: "auto",
        border: "1px solid #ccc",
      }}
    >
      <div className="sticky top-0 bg-white/90 z-10 pb-2">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">💬 רמזים וניחושים</h3>
          {isUserScrolledUp && (
            <button
              onClick={() => {
                setIsUserScrolledUp(false);
                if (containerRef.current) {
                  containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
              }}
              className="text-sm bg-blue-500 text-white px-2 py-1 rounded-full hover:bg-blue-600 transition-colors"
              title="גלול להודעות החדשות"
            >
              ↓ חדש
            </button>
          )}
        </div>
      </div>

      {combined.length === 0 ? (
        <p className="text-gray-500">אין רמזים או ניחושים עדיין...</p>
      ) : (
        <ul className="space-y-2">
          {combined.map((item, index) =>
            item.word && item.number !== undefined ? (
              <li
                key={`clue-${item.timestamp || index}`}
                className="p-2 rounded bg-white border border-gray-200"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-3 text-sm">
                  <div
                    className={
                      item.team === "Red"
                        ? "text-red-600 font-semibold"
                        : "text-blue-600 font-semibold"
                    }
                  >
                    {item.team === "Red"
                      ? "🟥 לוחש אדום"
                      : "🟦 לוחש כחול"}
                    : {item.giverName || "אנונימי"}
                  </div>
                  <div className="text-gray-800 whitespace-nowrap">
                    רמז: <strong>{item.word}</strong> – {item.number}
                  </div>
                </div>
              </li>
            ) : (
              <li
                key={`guess-${item.timestamp || index}`}
                className="text-sm text-gray-700"
              >
                {item.emoji} <strong>{item.username}</strong> לחץ על "<strong>{item.word}</strong>" – {item.text}
              </li>
            )
          )}
          {/* 👇 גלילה לתחתית */}
          <div ref={bottomRef} />
        </ul>
      )}
    </div>
  );
};

export default ClueChat;

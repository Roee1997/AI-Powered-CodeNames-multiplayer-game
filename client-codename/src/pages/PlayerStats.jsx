// src/pages/PlayerStats.jsx
import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import Header from "../components/UI/Header";
import API_BASE from "../config/api";
import { getAuth } from "firebase/auth";
import BackgroundImage from "../components/UI/BackgroundImage";
import codenamesImage from "../assets/codename.png";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const PlayerStats = () => {
  const [stats, setStats] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiStatsLoading, setAiStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;

        const res = await fetch(`${API_BASE}/api/Users/stats/${user.uid}`);
        if (!res.ok) throw new Error("Failed to fetch stats");

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchAIStats = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;

        const aiStatsRes = await fetch(`${API_BASE}/api/Stats/ai/${user.uid}`);
        if (aiStatsRes.ok) {
          const aiStatsData = await aiStatsRes.json();
          console.log("🤖 AI Stats data received:", aiStatsData);
          setAiStats(aiStatsData);
        } else {
          console.log("No AI stats available for user - Status:", aiStatsRes.status);
          setAiStats(null);
        }
      } catch (err) {
        console.error("Error fetching AI stats:", err);
        setAiStats(null);
      } finally {
        setAiStatsLoading(false);
      }
    };

    // Fetch both stats in parallel
    fetchStats();
    fetchAIStats();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-3xl text-yellow-400 animate-pulse">טוען סטטיסטיקות... 🕵️</div>
    </div>
  );
  
  if (!stats) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-2xl text-red-500">לא ניתן לטעון סטטיסטיקות 🚫</div>
    </div>
  );

  return (
    <>
      <Header />
      <BackgroundImage image={codenamesImage} />
      <div className="min-h-screen pt-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8" dir="rtl">
            <h1 className="text-5xl font-bold text-yellow-400 drop-shadow-lg mb-2 animate-fade-in">
              סטטיסטיקות משחק
            </h1>
            <p className="text-cyan-300 text-xl text-center">דו"ח ביצועים</p>
          </div>

          {/* סקציה 1: סטטיסטיקות בסיסיות */}
          <div className="mb-20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl blur-xl" />
            <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-8 border border-white/10">
              <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent" dir="rtl">
                סטטיסטיקות כלליות 
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <StatCard 
                  label="משחקים" 
                  value={stats.gamesPlayed} 
                  icon="🎯"
                  color="from-blue-600 to-blue-800"
                />
                <StatCard 
                  label="ניצחונות" 
                  value={stats.wins} 
                  icon="🏆"
                  color="from-green-600 to-green-800"
                />
                <StatCard 
                  label="אחוז הצלחה" 
                  value={`${stats.winRatePct}%`} 
                  icon="📊"
                  color="from-yellow-600 to-yellow-800"
                />
                <StatCard 
                  label="משחקים כלוחש" 
                  value={stats.timesSpymaster} 
                  icon="🕵️"
                  color="from-indigo-600 to-indigo-800"
                />
              </div>
            </div>
          </div>

          {/* סקציה 2: פירוט ביצועים */}
          <div className="mb-20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-yellow-500/5 to-red-500/5 rounded-3xl blur-xl" />
            <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-8 border border-white/10">
              <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-400 bg-clip-text text-transparent" dir="rtl">
                פירוט ביצועי ניחושים 
              </h2>
              <div className="grid grid-cols-3 gap-8">
                <StatCard 
                  label="ניחושים נכונים" 
                  value={stats.correct} 
                  icon="✅"
                  color="from-emerald-600 to-emerald-800"
                />
                <StatCard 
                  label="ניחושים שגויים" 
                  value={stats.wrong} 
                  icon="❌"
                  color="from-red-600 to-red-800"
                />
                <StatCard 
                  label="פגיעות במתנקש" 
                  value={stats.assassin} 
                  icon="💀"
                  color="from-purple-600 to-purple-800"
                />
              </div>
            </div>
          </div>

          {/* סקציה 3: שיתוף פעולה עם AI */}
          {aiStats && (
            <div className="mb-20 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-pink-500/5 to-purple-500/5 rounded-3xl blur-xl" />
              <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-8 border border-white/10">
                <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 via-pink-400 to-purple-400 bg-clip-text text-transparent" dir="rtl">
                  שיתוף פעולה עם AI 
                </h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                  <StatCard 
                    label="הצלחתי לנחש מרמזי AI" 
                    value={`${aiStats.userAccuracyFromAIClues ? aiStats.userAccuracyFromAIClues.toFixed(1) : '0.0'}%`} 
                    icon="🎯"
                    color="from-cyan-600 to-cyan-800"
                  />
                  <StatCard 
                    label="AI הצליח לנחש מהרמזים שלי" 
                    value={`${aiStats.aiAccuracyFromUserClues ? aiStats.aiAccuracyFromUserClues.toFixed(1) : '0.0'}%`} 
                    icon="🧠"
                    color="from-teal-600 to-teal-800"
                  />
                  <StatCard 
                    label="כמה ניחושים עשיתי מרמזי AI" 
                    value={aiStats.totalUserGuessesFromAIClues || 0} 
                    icon="⚡"
                    color="from-pink-600 to-pink-800"
                  />
                  <StatCard 
                    label="כמה ניחושים AI עשה מהרמזים שלי" 
                    value={aiStats.totalAIGuessesFromUserClues || 0} 
                    icon="🚀"
                    color="from-orange-600 to-orange-800"
                  />
                </div>
                
                <div className="relative overflow-hidden bg-gradient-to-br from-yellow-900/40 to-orange-900/40 backdrop-blur-xl rounded-3xl p-10 border border-yellow-400/30 shadow-2xl">
                  <div className="absolute top-0 left-0 w-40 h-40 bg-yellow-400/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-xl" />
                  <div className="relative z-10">
                    <h3 className="text-4xl font-bold text-yellow-300 mb-8 text-center" dir="rtl">
                      ציון שיתוף פעולה כללי ⭐
                    </h3>
                    <div className="text-center">
                      <div className="text-8xl font-bold bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent mb-6 transform hover:scale-110 transition-transform duration-300">
                        {(((aiStats.userAccuracyFromAIClues || 0) + (aiStats.aiAccuracyFromUserClues || 0)) / 2).toFixed(1)}%
                      </div>
                      <p className="text-yellow-100 text-2xl mb-8 font-medium text-center" dir="rtl">
                        ממוצע הדדי של איכות השיתוף
                      </p>
                      <div className="relative w-full max-w-lg mx-auto">
                        <div className="w-full bg-gray-800/50 rounded-full h-8 border border-gray-600/30 backdrop-blur-sm">
                          <div 
                            className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 h-8 rounded-full transition-all duration-3000 shadow-lg shadow-yellow-400/50 animate-pulse"
                            style={{ width: `${((aiStats.userAccuracyFromAIClues || 0) + (aiStats.aiAccuracyFromUserClues || 0)) / 2}%` }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-full blur-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Loading */}
          {aiStatsLoading && (
            <div className="mb-20 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 via-blue-500/5 to-purple-500/5 rounded-3xl blur-xl animate-pulse" />
              <div className="relative backdrop-blur-sm bg-white/[0.02] rounded-3xl p-8 border border-white/10">
                <h2 className="text-5xl font-bold text-center mb-12 bg-gradient-to-r from-gray-400 via-blue-400 to-purple-400 bg-clip-text text-transparent" dir="rtl">
                  טוען נתוני AI... 🤖
                </h2>
                <div className="grid grid-cols-4 gap-8">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="relative overflow-hidden bg-gradient-to-br from-gray-600/20 to-gray-800/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
                      <div className="animate-pulse">
                        <div className="text-5xl mb-4 opacity-50">🤖</div>
                        <div className="h-4 bg-gray-700/50 rounded mb-3 animate-pulse"></div>
                        <div className="h-8 bg-gray-700/50 rounded animate-pulse"></div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Games */}
          <div className="mb-20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 rounded-3xl blur-xl" />
            <div className="relative overflow-hidden bg-black/40 backdrop-blur-xl rounded-3xl p-10 border border-amber-400/20 shadow-2xl">
              <div className="absolute top-0 right-0 w-52 h-52 bg-amber-400/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-orange-400/5 rounded-full blur-2xl" />
              <div className="relative z-10">
                <h2 className="text-5xl font-bold mb-10 text-center bg-gradient-to-r from-amber-300 via-orange-300 to-red-300 bg-clip-text text-transparent" dir="rtl">
                  היסטוריית משחקים 
                </h2>
                <div className="overflow-x-auto backdrop-blur-sm bg-white/[0.02] rounded-2xl border border-white/10">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-600">
                        <th className="px-4 py-3 text-right text-cyan-300">תאריך</th>
                        <th className="px-4 py-3 text-right text-cyan-300">קבוצה</th>
                        <th className="px-4 py-3 text-right text-cyan-300">תפקיד</th>
                        <th className="px-4 py-3 text-right text-cyan-300">תוצאה</th>
                        <th className="px-4 py-3 text-center text-cyan-300">נכון</th>
                        <th className="px-4 py-3 text-center text-cyan-300">שגוי</th>
                        <th className="px-4 py-3 text-center text-cyan-300">מתנקש</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentGames && stats.recentGames.map((game, idx) => (
                        <tr
                          key={idx}
                          className={`
                            border-b border-gray-700 hover:bg-gray-800 transition-colors
                            ${idx % 2 === 0 ? 'bg-gray-900 bg-opacity-50' : 'bg-gray-800 bg-opacity-50'}
                          `}
                        >
                          <td className="px-4 py-3 text-right text-gray-300">{new Date(game.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-1 rounded ${
                              game.team === 'Red' ? 'bg-red-900 text-red-200' : 'bg-blue-900 text-blue-200'
                            }`}>
                              {game.team === 'Red' ? 'אדום' : 'כחול'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">
                            {game.role === 'Spymaster' ? '🕵️ לוחש' : '👥 סוכן'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-1 rounded ${
                              game.result === 'Win' 
                                ? 'bg-green-900 text-green-200' 
                                : 'bg-red-900 text-red-200'
                            }`}>
                              {game.result === 'Win' ? '🏆 ניצחון' : '❌ הפסד'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-green-400">{game.correct}</td>
                          <td className="px-4 py-3 text-center text-red-400">{game.wrong}</td>
                          <td className="px-4 py-3 text-center">{game.assassin > 0 ? '💀' : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const StatCard = ({ label, value, icon, color }) => (
  <div className={`
    relative overflow-hidden
    bg-gradient-to-br ${color}
    backdrop-blur-xl bg-opacity-20
    rounded-2xl p-6 
    transform hover:scale-110 hover:-translate-y-2 hover:rotate-1
    transition-all duration-500 ease-out
    border border-white/20 shadow-2xl
    before:absolute before:inset-0 
    before:bg-gradient-to-br before:from-white/10 before:to-transparent
    before:opacity-0 hover:before:opacity-100
    before:transition-opacity before:duration-300
    group cursor-pointer
    text-center
  `}>
    <div className="relative z-10 text-center">
      <div className="text-5xl mb-4 transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-300 text-center">{icon}</div>
      <div className="text-gray-100 text-lg mb-3 font-medium text-center" dir="rtl">{label}</div>
      <div className="text-4xl font-bold text-white group-hover:text-yellow-200 transition-colors duration-300 text-center">{value}</div>
    </div>
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500" />
  </div>
);

export default PlayerStats;
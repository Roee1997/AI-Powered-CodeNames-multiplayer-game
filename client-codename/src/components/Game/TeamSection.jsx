import React from "react";
import { motion } from "framer-motion";
import { LogOut, Shuffle, Eye, UserCog, X, Bot } from "lucide-react";

// Predefined AI Spymaster Profiles
const AI_PROFILES = {
  CUSTOM: {
    id: 'custom',
    name: 'מותאם אישית',
    prompt: '',
    description: 'הזן הגדרה מותאמת אישית'
  },
  SPACE_OCEAN: {
    id: 'space_ocean',
    name: 'מומחה חלל וים (80)',
    prompt: `פרופסור בן 80 מומחה חלל וים. **מטרה: לנצח!** 

🔴 חובה לציית:
• מילה אחת בלבד!!! (לא ביטוי/צירוף)
• לא מופיע בלוח: {allWords}
• לא נחשף: {revealedWords}
• לא שימוש קודם: {previousClueWords}
• לא היריב/מתנקש: {opponentWords}/{assassinWord}

🔬 אסטרטגיה:
1. יש קשר מדעי לחלל/ים? → תן רמז מדעי (נפטון, מאדים, תהום)
2. אין קשר? → רמז רגיל (רהיטים, פרי)
3. העדף 2-3 מילים אם הקשר חזק

פורמט: <רמז>, <מספר>`,
    description: 'פרופסור אסטרטגי - מדע רק כשמועיל לניצחון'
  },
  GAMER_POP: {
    id: 'gamer_pop',
    name: 'גיימר ותרבות פופ (20)',
    prompt: `אתה גיימר צעיר בן 20 שמכיר תרבות פופ מודרנית, אבל המטרה העיקרית שלך היא לעזור לקבוצה לנצח.

🎮 FIRST - בדוק את המילים בלוח:
האם יש מילים שקשורות באמת לגיימינג/מוזיקה/סרטים? (מלך, כתר, קרב, חרב, אדום, מהיר, מוזיקה, לב, כחול, זהב וכו')

✅ אם יש קשר פופולרי טוב - תן רמז מתרבות הפופ:
השתמש בידע על משחקי וידאו, זמרים, סרטים, Netflix, מדיה חברתית ותרבות רשת.

❌ אם אין קשר פופולרי טוב - תתעלם מהנושא הפופולרי:
תן רמז רגיל, פשוט ויעיל שיעזור לקבוצה לנצח. אל תכריח קשרים מלאכותיים לגיימינג או מוזיקה!

דוגמאות נכונות:
✅ "מלך, כתר" → "בייונסה, 2" (יש קשר מוזיקלי טוב)
✅ "קרב, חרב" → "מינקרפט, 2" (יש קשר גיימינג מעולה)
✅ "אדום, מהיר" → "פלאש, 2" (יש קשר סרטים/קומיקס טוב)
❌ "שולחן, כיסא" → אל תיתן "פורטנייט"! תן רמז רגיל כמו "רהיטים, 2"

זכור: מוטב רמז פשוט שעובד מאשר רמז "פופולרי" שלא קשור למילים!

🎮 STRATEGIC RISK-TAKING:
אל תהיה שמרן מדי! אם יש לך קשר פופולרי טוב:
- נסה לכסות 2-3 מילים אם הקשר לגיימינג/מוזיקה חזק
- לדוגמה: אם יש "קרב, אדום, מהיר" תן "מינקרפט, 3" במקום רק "קרב, 1"
- העדף אסטרטגיה על פני זהירות - רמז פופולרי ל-2-3 מילים יכול לזכות במשחק!`,
    description: 'מתמחה בגיימינג ופופ - רק כשמתאים למילים בלוח'
  },
  MEDIEVAL: {
    id: 'medieval',
    name: 'היסטוריון ימי ביניים',
    prompt: `אתה היסטוריון מתמחה בימי הביניים, אבל המטרה העיקרית שלך היא לעזור לקבוצה לנצח.

🏰 FIRST - בדוק את המילים בלוח:
האם יש מילים שקשורות באמת לימי הביניים? (מלך, קרב, זהב, כסף, אבן, גבוה, חרב, מים, אש וכו')

✅ אם יש קשר טוב - תן רמז היסטורי:
השתמש בידע על אבירים, טירות, מלכים, מלחמות צלב, אצולה ותרבות המאות ה-12-15.

❌ אם אין קשר טוב - תתעלם מהנושא ההיסטורי:
תן רמז רגיל, פשוט ויעיל שיעזור לקבוצה לנצח. אל תכריח קשרים מלאכותיים לימי הביניים!

דוגמאות נכונות:
✅ "זהב, כסף" → "אוצר, 2" (יש קשר היסטורי טוב)
✅ "מלך, כתר" → "שארלמן, 2" (יש קשר היסטורי מעולה)
❌ "מחשב, טלפון" → אל תיתן "פיאודליזם"! תן רמז רגיל כמו "טכנולוגיה, 2"

זכור: מוטב רמז פשוט שעובד מאשר רמז "היסטורי" שלא קשור למילים!

🎯 STRATEGIC RISK-TAKING:
אל תהיה שמרן מדי! אם יש לך קשר היסטורי טוב:
- נסה לכסות 2-3 מילים אם הקשר ההיסטורי חזק
- לדוגמה: אם יש "מלך, זהב, חרב" תן "צלבנים, 3" במקום רק "מלך, 1"
- העדף אסטרטגיה על פני זהירות - רמז ל-2-3 מילים יכול לזכות במשחק!`,
    description: 'מתמחה באבירים וטירות - רק כשמתאים למילים בלוח'
  }
};


const TeamSection = ({
  teamColor,
  players,
  userId,
  onSwitchTeam,
  onToggleSpymaster,
  onLeave,
  onKickPlayer,
  onJoinAsAgent,
  onJoinAsSpymaster,
  handleAddAI,
  isCreator,
  removeAI,
  aiPrompts,
  setAiPrompts,
  saveAiPrompt,
  savedPrompts,
  setSavedPrompts,
  aiProfiles,
  saveAiProfile
}) => {
  // State for selected AI profile
  const [selectedProfile, setSelectedProfile] = React.useState(AI_PROFILES.CUSTOM.id);
  const [customPromptBackup, setCustomPromptBackup] = React.useState('');

  // Sync profile state with Firebase data
  React.useEffect(() => {
    const teamKey = teamColor.toLowerCase();
    if (aiProfiles && aiProfiles[teamKey]) {
      setSelectedProfile(aiProfiles[teamKey]);
    }
  }, [aiProfiles, teamColor]);

  const teamPlayers = players.filter(p => p.team === teamColor);
  const isRed = teamColor === "Red";
  const teamName = isRed ? "אדומה" : "כחולה";
  const currentPlayer = teamPlayers.find(p => p.userID === userId);
  const hasSpymaster = teamPlayers.some(p => p.isSpymaster);
  const hasOperative = teamPlayers.some(p => !p.isSpymaster);
  const hasAISpymaster = teamPlayers.some(p => p.isAI && p.isSpymaster);
  const hasAIOperative = teamPlayers.some(p => p.isAI && !p.isSpymaster);
  // Check if user is in any team (Red or Blue)
  const userInAnyTeam = players.find(p => p.userID === userId);

  // Handle profile selection change
  const handleProfileChange = (profileId) => {
    const teamKey = teamColor.toLowerCase();
    const currentPrompt = aiPrompts?.[teamKey] || '';

    // Backup current custom prompt if switching away from custom
    if (selectedProfile === AI_PROFILES.CUSTOM.id && profileId !== AI_PROFILES.CUSTOM.id) {
      setCustomPromptBackup(currentPrompt);
    }

    setSelectedProfile(profileId);

    // Update the prompt based on selected profile
    if (profileId === AI_PROFILES.CUSTOM.id) {
      // Restore custom prompt backup
      setAiPrompts?.(prev => ({
        ...prev,
        [teamKey]: customPromptBackup
      }));
    } else {
      // Set predefined profile prompt
      const profile = Object.values(AI_PROFILES).find(p => p.id === profileId);
      if (profile) {
        setAiPrompts?.(prev => ({
          ...prev,
          [teamKey]: profile.prompt
        }));
      }
    }

    // Reset saved state when profile changes
    setSavedPrompts?.(prev => ({
      ...prev,
      [teamKey]: false
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const playerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const roleIcon = (role) => {
    if (role === "spymaster") {
      return <Eye className="w-6 h-6" />;
    } else {
      return <UserCog className="w-6 h-6" />;
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      transition={{ duration: 0.5 }}
      className={`flex-1 rounded-2xl shadow-lg overflow-hidden ${isRed
        ? "bg-gradient-to-br from-red-50 to-red-100 border border-red-200"
        : "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
        }`}
    >
      {/* Header */}
      <div className={`p-4 ${isRed ? "bg-red-600" : "bg-blue-600"
        } text-white`}>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Eye className="w-6 h-6" />
          קבוצה {teamName}
        </h2>
      </div>

      {/* Players List */}
      <div className="p-4 space-y-3">
        {/* Join Buttons when not in team */}
        {!currentPlayer && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
              {!hasOperative && (
                <button
                  onClick={onJoinAsAgent}
                  className={`flex-1 py-2 md:py-3 px-3 md:px-4 rounded-xl text-sm md:text-base font-bold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${isRed
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                >
                  <UserCog className="w-5 h-5 md:w-6 md:h-6" />
                  הצטרף כסוכן
                </button>
              )}
            </div>
            {!hasSpymaster && (
              <div className="flex gap-2">
                <button
                  onClick={onJoinAsSpymaster}
                  className={`flex-1 py-2 md:py-3 px-3 md:px-4 rounded-xl text-sm md:text-base font-bold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${isRed
                    ? "bg-red-700 hover:bg-red-800 text-white"
                    : "bg-blue-700 hover:bg-blue-800 text-white"
                    }`}
                >
                  <Eye className="w-5 h-5 md:w-6 md:h-6" />
                  הצטרף כלוחש
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI Buttons - Always visible to creator */}
        {isCreator && (
          <div className="flex flex-col gap-2 mb-4">
            {!hasOperative && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddAI(teamColor, "operative")}
                  className={`flex-1 py-2 md:py-3 px-3 md:px-4 rounded-xl text-sm md:text-base font-bold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${isRed
                    ? "bg-red-200/50 hover:bg-red-300/50 text-red-800"
                    : "bg-blue-200/50 hover:bg-blue-300/50 text-blue-800"
                    }`}
                  title="הוסף AI סוכן"
                >
                  <Bot className="w-5 h-5 md:w-6 md:h-6" />
                  הוסף AI סוכן
                </button>
              </div>
            )}
            {!hasSpymaster && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddAI(teamColor, "spymaster")}
                  className={`flex-1 py-2 md:py-3 px-3 md:px-4 rounded-xl text-sm md:text-base font-bold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${isRed
                    ? "bg-red-200/50 hover:bg-red-300/50 text-red-800"
                    : "bg-blue-200/50 hover:bg-blue-300/50 text-blue-800"
                    }`}
                  title="הוסף AI לוחש"
                >
                  <Bot className="w-5 h-5 md:w-6 md:h-6" />
                  הוסף AI לוחש
                </button>
              </div>
            )}
          </div>
        )}

        {teamPlayers.map(player => (
          <motion.div
            key={player.userID}
            variants={playerVariants}
            className={`rounded-lg p-3 ${player.userID === userId
              ? isRed ? "bg-red-100 border border-red-200" : "bg-blue-100 border border-blue-200"
              : "bg-white border border-gray-100"
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {player.isSpymaster ? (
                  <Eye className={`w-6 h-6 ${isRed ? "text-red-600" : "text-blue-600"}`} />
                ) : (
                  <UserCog className={`w-6 h-6 ${isRed ? "text-red-600" : "text-blue-600"}`} />
                )}
                <div className="flex flex-col">
                  <span className={`font-medium ${player.userID === userId ? "text-gray-900" : "text-gray-700"
                    }`}>
                    {player.username || (player.userID === userId ? "אתה" : `שחקן (${player.userID.slice(0, 5)}...)`)}
                  </span>
                  <span className={`text-xs font-medium ${isRed ? "text-red-600" : "text-blue-600"
                    }`}>
                    {player.isSpymaster ? "לוחש" : "סוכן"}
                  </span>
                </div>
              </div>

              {player.userID === userId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleSpymaster}
                    className={`p-2 rounded-full transition-colors ${isRed
                      ? "hover:bg-red-200 text-red-700"
                      : "hover:bg-blue-200 text-blue-700"
                      }`}
                    title={player.isSpymaster ? "הפוך לסוכן" : "הפוך ללוחש"}
                  >
                    {player.isSpymaster ? <UserCog className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={onLeave}
                    className="p-2 rounded-full hover:bg-gray-200 text-gray-700 transition-colors"
                    title="צא מהקבוצה"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isCreator && player.isAI && (
                <button
                  onClick={() => removeAI(player.userID)}
                  className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                  title="הסר שחקן AI"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isCreator && !player.isAI && player.userID !== userId && !player.isCreator && (
                <button
                  onClick={() => onKickPlayer(player.userID)}
                  className="p-2 rounded-full hover:bg-red-100 text-red-600 transition-colors"
                  title="הסר שחקן"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {player.userID === userId && (
              <div className={`mt-3 text-sm ${isRed ? "text-red-700" : "text-blue-700"
                }`}>
                {player.isSpymaster ? "👁️ לוחש - אתה רואה את כל הקלפים" : "🕵️ סוכן - עליך לנחש לפי הרמזים"}
              </div>
            )}
          </motion.div>
        ))}

        {/* Empty State - only show if no players and user is not in any team */}
        {teamPlayers.length === 0 && !currentPlayer && (
          <div className="text-center py-4 text-gray-500">
            <UserCog className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>אין שחקנים בקבוצה זו</p>
          </div>
        )}

        {/* AI Prompt Configuration - Only show when AI spymaster is in team */}
        {isCreator && hasAISpymaster && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`mt-4 p-4 rounded-2xl shadow-lg overflow-hidden relative ${isRed
              ? "bg-gradient-to-br from-red-600 to-red-800 border border-red-400"
              : "bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-400"
              }`}
          >
            {/* Decorative Background Element */}
            <div className={`absolute top-0 right-0 w-24 h-24 ${isRed ? "bg-red-500" : "bg-blue-500"
              } opacity-10 rounded-full blur-2xl`}></div>

            <div className="relative z-10">
              <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2">
                🎯 הגדרת התנהגות AI לוחש - קבוצה {teamName}
              </label>

              <div className={`mb-3 p-3 rounded-lg border text-xs font-medium ${isRed
                ? "bg-green-900/50 border-green-400/30 text-green-100"
                : "bg-green-900/50 border-green-400/30 text-green-100"
                } backdrop-blur-sm`}>
                ✅ AI לוחש פעיל בקבוצה זו - ההגדרה תשפיע על התנהגותו במשחק
              </div>

              {/* Profile Selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-white mb-2 flex items-center gap-2">
                  🤖 בחר אישיות AI:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(AI_PROFILES).map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${selectedProfile === profile.id
                        ? isRed
                          ? "bg-red-700/70 border-red-300/60 text-white"
                          : "bg-blue-700/70 border-blue-300/60 text-white"
                        : isRed
                          ? "bg-red-900/30 border-red-400/20 text-red-100 hover:bg-red-800/40"
                          : "bg-blue-900/30 border-blue-400/20 text-blue-100 hover:bg-blue-800/40"
                        } backdrop-blur-sm`}
                      onClick={() => handleProfileChange(profile.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${selectedProfile === profile.id
                          ? "border-white bg-white"
                          : "border-gray-400"
                          }`}>
                          {selectedProfile === profile.id && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isRed ? "bg-red-600" : "bg-blue-600"
                              }`}></div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{profile.name}</div>
                          <div className="text-xs opacity-80">{profile.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                value={aiPrompts?.[teamColor.toLowerCase()] || ""}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setAiPrompts?.(prev => ({
                    ...prev,
                    [teamColor.toLowerCase()]: newValue
                  }));

                  // If user manually edits and it doesn't match any predefined profile, switch to custom
                  const matchingProfile = Object.values(AI_PROFILES).find(p => p.prompt === newValue);
                  if (matchingProfile) {
                    setSelectedProfile(matchingProfile.id);
                  } else {
                    setSelectedProfile(AI_PROFILES.CUSTOM.id);
                    setCustomPromptBackup(newValue);
                  }

                  // Reset saved state when user modifies text
                  setSavedPrompts?.(prev => ({
                    ...prev,
                    [teamColor.toLowerCase()]: false
                  }));
                }}
                placeholder={selectedProfile === AI_PROFILES.CUSTOM.id
                  ? "הכנס הגדרה מותאמת אישית לAI...\n\nדוגמאות:\n• מותר לך לכתוב רק במונחי חפצים שיש בחלל ותן רמז ל-1 מילה בלבד\n• השתמש רק במונחים מעולם הספורט ותן רמז לכל היותר 2 מילים\n\nזכור: AI חייב למצוא קשר בין ההגדרה שלך למילים בלוח!"
                  : `נבחרה אישיות: ${Object.values(AI_PROFILES).find(p => p.id === selectedProfile)?.name}\n\nניתן לערוך את התיאור או לבחור 'מותאם אישית' להגדרה חופשית.`
                }
                className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm resize-none backdrop-blur-sm border font-medium ${isRed
                  ? "bg-red-900/50 border-red-400/30 text-white placeholder-red-200"
                  : "bg-blue-900/50 border-blue-400/30 text-white placeholder-blue-200"
                  } focus:outline-none focus:ring-2 focus:ring-white/30 transition-all`}
                rows={5}
              />

              <button
                onClick={() => {
                  const teamKey = teamColor.toLowerCase();
                  const currentPrompt = aiPrompts?.[teamKey] || "";
                  saveAiPrompt?.(teamKey, currentPrompt, selectedProfile);
                  saveAiProfile?.(teamKey, selectedProfile);
                }}
                className={`mt-3 px-4 md:px-6 py-2 md:py-3 text-sm md:text-base font-bold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 rounded-xl ${isRed
                  ? "bg-red-700 hover:bg-red-800 text-white border border-red-500"
                  : "bg-blue-700 hover:bg-blue-800 text-white border border-blue-500"
                  } backdrop-blur-sm`}
              >
                💾 שמור הגדרה
              </button>

              {savedPrompts?.[teamColor.toLowerCase()] && (
                <div className={`mt-3 p-3 rounded-lg border text-xs font-medium ${isRed
                  ? "bg-green-900/50 border-green-400/30 text-green-100"
                  : "bg-green-900/50 border-green-400/30 text-green-100"
                  } backdrop-blur-sm`}>
                  ✅ הגדרה נשמרה עבור קבוצה {teamName} -
                  {teamPlayers.find(p => p.isAI && p.isSpymaster)
                    ? "AI פעיל ויזכור את ההוראות האלה לאורך כל המשחק"
                    : "תופעל כאשר תוסיף AI לוחש"
                  }
                </div>
              )}

              <div className={`mt-3 p-3 rounded-lg border text-xs ${isRed
                ? "bg-yellow-900/50 border-yellow-400/30 text-yellow-100"
                : "bg-yellow-900/50 border-yellow-400/30 text-yellow-100"
                } backdrop-blur-sm`}>
                <strong>💡 טיפים:</strong>
                <br />• ציין בבירור את מגבלת המספרים (למשל: "רמז ל-1 מילה בלבד")
                <br />• AI חייב למצוא קשר בין ההגדרה שלך למילים בלוח
                <br />• ההגדרה תעבוד רק אם יש מילים רלוונטיות בלוח
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default TeamSection;
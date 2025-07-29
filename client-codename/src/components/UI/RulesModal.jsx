import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black bg-opacity-80" />
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              📜 חוקי המשחק – שם קוד
            </h1>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              aria-label="סגור"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div 
            className="flex-1 overflow-y-scroll p-6"
            style={{
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              willChange: 'scroll-position'
            }}
          >
            <div className="text-white text-lg leading-relaxed space-y-5">
              <p className="text-gray-300">
                שם קוד הוא משחק תחרותי לשתי קבוצות - אדומה וכחולה. על הלוח מופיעות 25 מילים: לקבוצה אחת יש 9 קלפים, לשנייה 8 קלפים, יש גם קלפים ניטרליים ומתנקש אחד. הקבוצה הראשונה שתמצא את כל הקלפים שלה מנצחת!
              </p>

              <div>
                <h2 className="font-bold text-xl mb-3 text-blue-400 flex items-center gap-2">
                  🎲 הצטרפות לקבוצות ותפקידים
                </h2>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300 mr-4">
                  <li>בחרו קבוצה - אדומה או כחולה</li>
                  <li><strong>לוחש (Spymaster):</strong> לחצו "הצטרף כלוחש" - רק אחד בכל קבוצה! רואה את צבעי הקלפים ונותן רמזים</li>
                  <li><strong>סוכן (Operative):</strong> לחצו "הצטרף כסוכן" - יכול להיות כמה בקבוצה! מנחש קלפים לפי הרמזים</li>
                  <li>אפשר להוסיף שחקני AI לקבוצות או להחליף תפקידים לפני התחלת המשחק</li>
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-xl mb-3 text-green-400 flex items-center gap-2">
                  💡 מתן רמזים (רק הלוחש!)
                </h2>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300 mr-4">
                  <li>הלוחש רואה את צבעי הקלפים ונותן רמז לסוכנים שלו</li>
                  <li><strong>פורמט רמז:</strong> מילה אחת + מספר (1-8). למשל: "חיות 3" או "ספורט 2"</li>
                  <li>המספר מציין כמה קלפים קשורים לרמז</li>
                  <li><strong>אסור:</strong> להשתמש במילים שכבר מופיעות על הלוח</li>
                  <li className="text-red-300 font-bold">🚨 היזהרו מהמתנקש! אם הסוכנים יבחרו בו - הקבוצה מפסידה מיד!</li>
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-xl mb-3 text-purple-400 flex items-center gap-2">
                  🕵️ ניחוש (הסוכנים!)
                </h2>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300 mr-4">
                  <li>אחרי שהלוחש נתן רמז, הסוכנים לחצים על הקלפים שלדעתם קשורים</li>
                  <li><strong>מספר ניחושים:</strong> עד למספר שנתן הלוחש (למשל: רמז "חיות 3" = עד 3 ניחושים)</li>
                  <li>לחצו על קלף כדי לנחש - אם זה קלף שלכם הוא יתגלה והתור ממשיך</li>
                  <li>גם אפשר לנחש מילים שנותרו מרמזים של תורות קודמים</li>
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-xl mb-3 text-orange-400 flex items-center gap-2">
                  🔚 מתי התור נגמר?
                </h2>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300 mr-4">
                  <li><strong>ניחוש שגוי:</strong> נחשתם קלף של הקבוצה השנייה - התור עובר אליהם</li>
                  <li><strong>קלף ניטרלי:</strong> נחשתם קלף ניטרלי (לא שייך לאף קבוצה) - התור נגמר</li>
                  <li><strong>עצירה ידנית:</strong> הסוכנים יכולים לבחור לעצור ולא לנחש יותר</li>
                  <li><strong>הגעתם למקסימום:</strong> ניחשתם את מספר הקלפים המרבי שהרמז אפשר</li>
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-xl mb-3 text-yellow-400 flex items-center gap-2">
                  🏆 איך מנצחים ומפסידים?
                </h2>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300 mr-4">
                  <li><strong className="text-green-400">ניצחון:</strong> הקבוצה הראשונה שתמצא את כל הקלפים שלה (8 או 9 קלפים) מנצחת!</li>
                  <li><strong className="text-red-400">הפסד מיידי:</strong> אם הקבוצה שלכם תבחר בקלף המתנקש (האסון) - אתם מפסידים מיד</li>
                  <li>הקבוצה עם 9 קלפים משחקת ראשונה (יותר קלפים = יתרון בתור)</li>
                </ul>
              </div>

              <div>
                <h2 className="font-bold text-xl mb-3 text-cyan-400 flex items-center gap-2">
                  ⚙️ תכונות מיוחדות
                </h2>
                <ul className="list-disc list-inside space-y-1.5 text-gray-300 mr-4">
                  <li><strong>שחקני AI:</strong> אפשר להוסיף מחשב כלוחש או סוכן - הוא יתנהג בצורה חכמה!</li>
                  <li><strong>מצבי משחק:</strong> קלאסי (עברית) או מדעי (אנגלית) עם ניתוח מילים מתקדם</li>
                  <li><strong>התנתקות:</strong> אם שחקן מתנתק, המערכת תחליף אותו באוטומטי ב-AI</li>
                  <li><strong>טיימר:</strong> יש זמן מוגבל לתורות (ניתן להגדיר)</li>
                </ul>
              </div>

              <div className="text-center mt-6 pt-4 border-t border-gray-700">
                <p className="text-gray-400 italic text-base">
                  שם קוד אונליין – משחק אסטרטגי מרתק עם AI חכם, התמודדות בזמן אמת, והרבה כיף!
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-700 text-center flex-shrink-0">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              סגור
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RulesModal;
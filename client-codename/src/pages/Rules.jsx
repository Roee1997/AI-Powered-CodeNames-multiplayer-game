import React from "react";
import BackgroundImage from "../components/UI/BackgroundImage";
import Header from "../components/UI/Header";
import Footer from "../components/UI/Footer";
import codenamesImage from "../assets/codename.png";

const Rules = () => {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Header />
      <BackgroundImage image={codenamesImage} />

      {/* תוכן כללי */}
      <div className="relative z-10 flex-1 container mx-auto px-6 py-4 text-white" dir="rtl">
        <h1 className="text-3xl font-bold mb-4 text-center">📜 חוקי המשחק – שם קוד</h1>

        {/* תיבה נגללת עם חוקי המשחק */}
        <div 
          className="bg-black bg-opacity-60 p-6 rounded-lg shadow-md text-lg leading-relaxed overflow-y-scroll max-h-[calc(100vh-14rem)]"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="space-y-5">
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
      </div>

      <Footer />
    </div>
  );
};

export default Rules;

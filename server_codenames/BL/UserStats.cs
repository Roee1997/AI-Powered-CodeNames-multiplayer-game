using System;
using System.Collections.Generic;
using Server_codenames.DAL;     // DBservices

namespace server_codenames.BL
{
    /// <summary>
    ///  סטטיסטיקה מלאה של משתמש + פונקציה שמביאה אותה מה-DB
    /// </summary>
    public class UserStats
    {
        /* ====== סיכום כללי ====== */
        public int GamesPlayed { get; set; }
        public int Wins { get; set; }
        public double WinRatePct { get; set; }
        public int Correct { get; set; }
        public int Wrong { get; set; }
        public int Assassin { get; set; }
        public int TimesSpymaster { get; set; }

        /* ====== משחקים אחרונים ====== */
        public List<RecentGame> RecentGames { get; set; } = new();

        /// <summary>
        ///  מביא סטטיסטיקה למזהה-משתמש ויוצר אובייקט UserStats מלא
        /// </summary>
        public static UserStats Load(string userId)
        {
            DBservices db = new DBservices();
            return db.GetUserStatsDB(userId);   // הפונקציה שכתבנו ב-DAL
        }
    }

    /* --- אובייקט עזר לשורה אחת בטבלת "משחקים אחרונים" --- */
    public class RecentGame
    {
        public DateTime Date { get; set; }
        public string Team { get; set; }    // "Red"/"Blue"
        public string Role { get; set; }    // "Agent"/"Spymaster"
        public string Result { get; set; }    // "Win"/"Loss"
        public int Correct { get; set; }
        public int Wrong { get; set; }
        public int Assassin { get; set; }
    }
}

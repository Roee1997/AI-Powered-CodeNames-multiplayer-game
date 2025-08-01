/**
 * Game Business Logic Class - מחלקת הלוגיקה העסקית של המשחק
 * 
 * אחראית על:
 * - ניהול מחזור חיי המשחק (יצירה, עדכון מצב, סיום)
 * - אכיפת כללי עסק למשחקים (מניעת כפילות, בדיקת הרשאות)
 * - תיאום עם שכבת הנתונים לביצוע פעולות במסד
 * - בדיקת תקינות משחק ומצבים שונים
 * 
 * מתכונות עיקריות:
 * - זיהוי משחקים זמינים להצטרפות
 * - מניעת יצירת משחקים כפולים לאותו משתמש  
 * - ניהול מצבי משחק (ממתין, פעיל, הסתיים)
 * - מעקב אחר צוות מנצח
 */

using Server_codenames.DAL;

namespace server_codenames.BL
{
    /// <summary>
    /// מחלקת המשחק המרכזית - מכילה את כל הלוגיקה העסקית לניהול משחקים
    /// משמשת כשכבת ביניים בין ה-Controllers לשכבת הנתונים
    /// </summary>
    public class Game
    {
        /// <summary>מזהה המשחק הייחודי - נוצר אוטומטית על ידי מסד הנתונים</summary>
        public int? GameID { get; set; }
        
        /// <summary>מזהה המשתמש שיצר את המשחק - שדה חובה</summary>
        public string CreatedBy { get; set; }
        
        /// <summary>תאריך ושעת יצירת המשחק - מוגדר אוטומטית על ידי השרת</summary>
        public DateTime? CreationDate { get; set; }
        
        /// <summary>מצב המשחק הנוכחי (Waiting/Active/Finished) - מעודכן במהלך המשחק</summary>
        public string? Status { get; set; }
        
        /// <summary>הצוות המנצח - null עד לסיום המשחק, אז מתעדכן ל-Red או Blue</summary>
        public string? WinningTeam { get; set; }

        /// <summary>
        /// קונסטרקטור ברירת מחדל - יוצר אובייקט משחק ריק
        /// משמש ביצירת אובייקטים חדשים לפני מילוי הנתונים
        /// </summary>
        public Game() { }

        /// <summary>
        /// קונסטרקטור מלא - יוצר אובייקט משחק עם כל הנתונים
        /// משמש בעיקר לטעינת נתונים ממסד הנתונים
        /// </summary>
        /// <param name="gameID">מזהה המשחק</param>
        /// <param name="createdBy">מזהה יוצר המשחק</param>
        /// <param name="creationDate">תאריך יצירה</param>
        /// <param name="status">מצב המשחק</param>
        /// <param name="winningTeam">צוות מנצח</param>
        public Game(int gameID, string createdBy, DateTime creationDate, string status, string winningTeam)
        {
            GameID = gameID;
            CreatedBy = createdBy;
            CreationDate = creationDate;
            Status = status;
            WinningTeam = winningTeam;
        }

        /// <summary>
        /// יוצר משחק חדש במסד הנתונים עם בדיקת כפילות
        /// מונע ממשתמש ליצור יותר ממשחק אחד ממתין בו זמנית 
        /// 
        /// לוגיקה עסקית:
        /// 1. בודק אם למשתמש יש כבר משחק ממתין
        /// 2. אם כן - מחזיר את המשחק הקיים
        /// 3. אם לא - יוצר משחق חדש
        /// 
        /// מטרה: למניעת זבל במסד הנתונים ובלבול משתמשים
        /// </summary>
        /// <returns>מזהה המשחק שנוצר או הקיים</returns>
        public int CreateGame()
        {
            DBservices dbs = new DBservices();
            
            // בדיקה אם למשתמש יש כבר משחק ממתין - כלל עסק חשוב
            Game existingWaitingGame = dbs.GetUserWaitingGame(this.CreatedBy);
            if (existingWaitingGame != null)
            {
                // החזרת המשחק הקיים במקום יצירת משחק חדש
                return existingWaitingGame.GameID.Value;
            }
            
            // יצירת משחק חדש רק אם אין משחק ממתין
            return dbs.CreateGame(this);
        }

        /// <summary>
        /// מחזיר משחק ממתין של משתמש ספציפי
        /// פונקציה סטטית המאפשרת בדיקה מבלי ליצור אובייקט משחק
        /// </summary>
        /// <param name="userId">מזהה המשתמש לבדיקה</param>
        /// <returns>משחק ממתין או null אם אין</returns>
        public static Game GetUserWaitingGame(string userId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetUserWaitingGame(userId);
        }

        /// <summary>
        /// בודק אם משתמש יכול להצטרף למשחק ספציפי
        /// מאמת הרשאות והגבלות עסקיות (משחק פתוח, לא מלא וכו')
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="userId">מזהה המשתמש</param>
        /// <returns>true אם יכול להצטרף, false אחרת</returns>
        public bool IsGameJoinable(int gameId, string userId)
        {
            DBservices dbs = new DBservices();
            return dbs.IsGameJoinable(gameId, userId);
        }

        /// <summary>
        /// מעדכן את מצב המשחק (Waiting -> Active -> Finished)
        /// פונקציה קריטית לניהול מחזור חיי המשחק
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="status">המצב החדש</param>
        /// <returns>true אם העדכון הצליח</returns>
        public bool UpdateGameStatus(int gameId, string status)
        {
            DBservices dbs = new DBservices();
            return dbs.UpdateGameStatus(gameId, status);
        }

        /// <summary>
        /// מעדכן את הצוות המנצח בסיום המשחק
        /// נקרא רק כאשר המשחק מסתיים עם מנצח ברור
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="winningTeam">שם הצוות המנצח (Red/Blue)</param>
        /// <returns>true אם העדכון הצליח</returns>
        public bool UpdateWinningTeam(int gameId, string winningTeam)
        {
            DBservices dbs = new DBservices();
            return dbs.UpdateWinningTeam(gameId, winningTeam);
        }

        /// <summary>
        /// בודק אם המשחק כבר הסתיים
        /// פונקציה חשובה למניעת פעולות על משחקים שהסתיימו
        /// משמשת את מערכת ה-AI למניעת רמזים/ניחושים מיותרים
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <returns>true אם המשחק הסתיים</returns>
        public bool IsGameFinished(int gameId)
        {
            DBservices dbs = new DBservices();
            return dbs.IsGameFinished(gameId);
        }
    }
}

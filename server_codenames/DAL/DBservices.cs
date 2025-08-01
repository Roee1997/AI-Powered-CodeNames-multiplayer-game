/**
 * DBservices - Data Access Layer (DAL) לפרויקט Codenames
 * 
 * שכבת הגישה לנתונים המרכזית שמנהלת את כל האינטראקציות עם מסד הנתונים SQL Server
 * אחראית על:
 * - ניהול חיבורים למסד הנתונים
 * - ביצוע כל השאילתות והפרוצדורות המאוחסנות
 * - המרת נתונים בין אובייקטי C# לטבלאות SQL
 * - טיפול בשגיאות והגנה על הנתונים
 * - ניהול נתוני משחקים, שחקנים, רמזים, ניחושים וסטטיסטיקות
 * 
 * מתכונות מרכזיות:
 * - אבטחת נתונים באמצעות Stored Procedures
 * - ניהול פרמטרים מותאם למניעת SQL Injection
 * - מערכת סטטיסטיקות מתקדמת לניתוח AI vs Human
 * - תמיכה בפעולות CRUD מלאות לכל הישויות
 * - מערכת דיווח מקיפה לשגיאות ולוגים
 */

using server_codenames.BL;
using System.Data.SqlClient;
using System.Data;
using server_codenames.Controllers;
using System.Diagnostics;

namespace Server_codenames.DAL
{
    /// <summary>
    /// מחלקת שירותי בסיס הנתונים המרכזית
    /// מכילה את כל הפונקציות לגישה ועיבוד נתונים במסד SQL Server
    /// </summary>
    public class DBservices
    {
        /// <summary>מתאם נתונים SQL לטעינת datasets</summary>
        public SqlDataAdapter da;
        
        /// <summary>טבלת נתונים זמנית לעבודה עם תוצאות שאילתות</summary>
        public DataTable dt;

        /// <summary>
        /// קונסטרקטור ברירת מחדל
        /// מאתחל את מתאם הנתונים וטבלת הנתונים הזמנית
        /// </summary>
        public DBservices()
        {
            // TODO: הוספת לוגיקת אתחול נוספת במידת הצורך
        }

        /// <summary>
        /// יוצר חיבור למסד הנתונים על בסיס connection string מקובץ ההגדרות
        /// פונקציה מרכזית שכל שיטות הגישה לנתונים משתמשות בה
        /// </summary>
        /// <param name="conString">שם החיבור בקובץ appsettings.json</param>
        /// <returns>חיבור פתוח למסד הנתונים</returns>
        public SqlConnection connect(String conString)
        {
            // קריאת מחרוזת החיבור מקובץ ההגדרות
            IConfigurationRoot configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json").Build();
            string cStr = configuration.GetConnectionString("myProjDB");
            
            // יצירת וההגדרת החיבור
            SqlConnection con = new SqlConnection(cStr);
            con.Open();
            return con;
        }

 //--------------------------------------------------------------------------------------------------
        // stats
        //--------------------------------------------------------------------------------------------------

/// <summary>
/// שולף סטטיסטיקות האינטראקציות בין המשתמש לשחקני AI
/// מחזיר נתונים על דיוק הניחושים של המשתמש מרמזי AI ודיוק AI מרמזי המשתמש
/// חיוני לניתוח ביצועי AI vs Human בפרספקטיבה אישית
/// </summary>
/// <param name="userId">מזהה המשתמש לחישוב הסטטיסטיקות</param>
/// <returns>אובייקט עם כל הסטטיסטיקות הרלוונטיות</returns>
public AIStatsDto GetAIStatsForUser(string userId)
{
    SqlConnection con = connect("myProjDB");

    Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@UserId", userId }
    };

    try
    {
        SqlCommand cmd = CreateCommandWithStoredProcedure("sp_GetMutualAIStats", con, paramDic);

        SqlDataReader reader = cmd.ExecuteReader();
        AIStatsDto stats = new AIStatsDto();

       if (reader.Read())
{
    stats.TotalUserGuessesFromAIClues = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader[0]);
    stats.CorrectUserGuessesFromAIClues = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader[1]);
    stats.UserAccuracyFromAIClues = reader.IsDBNull(2) ? 0 : Convert.ToDouble(reader[2]);

    stats.TotalAIGuessesFromUserClues = reader.IsDBNull(3) ? 0 : Convert.ToInt32(reader[3]);
    stats.CorrectAIGuessesFromUserClues = reader.IsDBNull(4) ? 0 : Convert.ToInt32(reader[4]);
    stats.AIAccuracyFromUserClues = reader.IsDBNull(5) ? 0 : Convert.ToDouble(reader[5]);
}
        reader.Close();
        con.Close();

        return stats;
    }
    catch (Exception ex)
    {
        con.Close();
        throw new Exception("🔥 שגיאה ב־GetAIStatsForUser: " + ex.Message);
    }
}

        //--------------------------------------------------------------------------------------------------
        // Clue 
        //--------------------------------------------------------------------------------------------------


        /// <summary>
        /// שומר רמז במסד הנתונים עם כל הפרטים הנלווים
        /// משמש לשמירת רמזים שניתנו על ידי שחקנים אמיתיים ושחקני AI
        /// כולל מעקב אחר זמני מתן רמזים לצורכי ניתוח וסטטיסטיקות
        /// </summary>
        /// <param name="clue">אובייקט הרמז עם כל הפרטים</param>
        /// <returns>true אם הרמז נשמר בהצלחה</returns>
        public bool SaveClue(Clue clue)
        {
            SqlConnection con = connect("myProjDB");

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@GameID", clue.GameID },
        { "@TurnID", clue.TurnID },
        { "@UserID", clue.UserID },
        { "@Team", clue.Team },
        { "@ClueWord", clue.ClueWord },
        { "@ClueNumber", clue.ClueNumber },
      
        { "@DurationInSeconds", clue.DurationInSeconds }
    };

            try
            {
                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_SaveClue", con, paramDic);
                int affected = cmd.ExecuteNonQuery();
                con.Close();

                if (affected == 0)
                    throw new Exception("השורה לא נשמרה (affected == 0)");

                return true;
            }
            catch (Exception ex)
            {
                con.Close();
                throw new Exception("🔥 שגיאה ב־SaveClue: " + ex.Message);
            }
        }



        //--------------------------------------------------------------------------------------------------
        // PLAYER IN GAME
        //--------------------------------------------------------------------------------------------------
        /// <summary>
        /// מחזיר רשימת כל השחקנים הרשומים למשחק ספציפי
        /// כולל פרטים על צוות, תפקיד (מרגל/סוכן) ושם משתמש
        /// חיוני לתצוגת הלובי ולוגיקת ניהול המשחק
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <returns>רשימת שחקנים עם כל הפרטים</returns>
        public List<PlayerInGame> GetPlayersInGame(int gameId)
        {
            List<PlayerInGame> players = new List<PlayerInGame>();
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");

                SqlCommand cmd = new SqlCommand("sp_GetPlayersInGame", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@GameID", gameId);

                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    PlayerInGame player = new PlayerInGame
                    {
                        GameID = gameId,
                        UserID = reader["UserID"].ToString(),
                        Team = reader["Team"].ToString(),
                        IsSpymaster = Convert.ToBoolean(reader["IsSpymaster"]),
                        Username = reader["Username"].ToString() // ✅ נוספה שליפת שם משתמש
                    };
                    players.Add(player);
                }

                return players;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
        /// <summary>
        /// בודק האם משתמש ספציפי הוא מרגל (Spymaster) במשחק נתון
        /// חשוב לאבטחת המידע - מרגלים רואים את צבעי הקלפים
        /// משמש לבקרת הרשאות בהצגת המידע
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="userId">מזהה המשתמש לבדיקה</param>
        /// <returns>true אם המשתמש הוא מרגל</returns>
        public bool IsUserSpymaster(int gameId, string userId)
        {
            SqlConnection con = null;
            try
            {
                con = connect("myProjDB");
                SqlCommand cmd = new SqlCommand("SELECT IsSpymaster FROM PlayersInGame WHERE GameID = @GameID AND UserID = @UserID", con);
                cmd.Parameters.AddWithValue("@GameID", gameId);
                cmd.Parameters.AddWithValue("@UserID", userId);
                object result = cmd.ExecuteScalar();
                return result != null && Convert.ToBoolean(result);
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
        /// <summary>
        /// מחזיר את קלפי הלוח במשחק עם רמת מידע המותאמת לתפקיד השחקן
        /// מרגלים רואים את צבעי כל הקלפים, סוכנים רואים רק קלפים חשופים
        /// מפעיל stored procedure חכמה שמחליטה מה להציג לפי הרשאות
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="userId">מזהה המשתמש (קובע רמת הרשאות)</param>
        /// <returns>רשימת קלפים עם רמת מידע מותאמת</returns>
        public List<Card> GetBoardForPlayer(int gameId, string userId)
        {
            List<Card> cards = new List<Card>();
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");

                SqlCommand cmd = new SqlCommand("sp_GetBoardForPlayer", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@GameID", gameId);
                cmd.Parameters.AddWithValue("@UserID", userId);

                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Card card = new Card
                    {
                        CardID = Convert.ToInt32(reader["CardID"]),
                        GameID = Convert.ToInt32(reader["GameID"]),
                        WordID = Convert.ToInt32(reader["WordID"]), // ✅ חדש
                        Word = reader["Word"].ToString(),           // ✅ מתוך טבלת Words
                        IsRevealed = Convert.ToBoolean(reader["IsRevealed"]),
                        Team = reader["Team"] == DBNull.Value ? null : reader["Team"].ToString()
                    };
                    cards.Add(card);
                }

                return cards;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

       /// <summary>
       /// מחזיר מילים אקראיות ממאגר המילים במסד הנתונים
       /// תומך בשפות שונות (עברית כברירת מחדל) ובמספר מילים מתכוונן
       /// משמש ליצירת לוחות משחק חדשים עם מילים שונות בכל פעם
       /// </summary>
       /// <param name="count">מספר המילים המבוקש (25 כברירת מחדל)</param>
       /// <param name="language">קוד השפה (he לעברית)</param>
       /// <returns>רשימת זוגות של מזהה מילה ומחרוזת המילה</returns>
       public List<(int WordID, string Word)> GetRandomWords(int count = 25, string language = "he")
{
    SqlConnection con = null;
    List<(int, string)> words = new List<(int, string)>();

    try
    {
        con = connect("myProjDB");

        SqlCommand cmd = new SqlCommand("sp_GetRandomWords", con);
        cmd.CommandType = CommandType.StoredProcedure;
        cmd.Parameters.AddWithValue("@Count", count);
        cmd.Parameters.AddWithValue("@Language", language); // ✅ חדש

        SqlDataReader reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            int wordId = Convert.ToInt32(reader["WordID"]);
            string word = reader["Word"].ToString();
            words.Add((wordId, word));
        }

        return words;
    }
    catch (Exception ex)
    {
        throw ex;
    }
    finally
    {
        if (con != null)
            con.Close();
    }
}



        /// <summary>
        /// מכניס רשימת קלפים למשחק ספציפי במסד הנתונים
        /// משמש ליצירת לוח משחק חדש עם הקצאת צוותים וחלוקת תפקידים
        /// כולל אימות שכל קלף מכיל את הנתונים הנדרשים (WordID, Team)
        /// </summary>
        /// <param name="cards">רשימת הקלפים להכנסה</param>
        /// <returns>true אם כל הקלפים הוכנסו בהצלחה</returns>
        public bool InsertCards(List<Card> cards)
        {
            SqlConnection con = connect("myProjDB");

            try
            {
                foreach (var card in cards)
                {
                    if (string.IsNullOrEmpty(card.Team))
                        throw new Exception("Team לא מוגדר באחד הקלפים");

                    if (card.WordID == 0)
                        throw new Exception("WordID חסר באחד הקלפים");

                    SqlCommand cmd = CreateCommandWithStoredProcedure("sp_InsertCard", con, new Dictionary<string, object>
            {
                { "@GameID", card.GameID },
                { "@WordID", card.WordID }, // 🆕 שימוש ב־WordID
                { "@Team", card.Team },
                { "@IsRevealed", card.IsRevealed }
            });

                    cmd.ExecuteNonQuery();
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ שגיאה בהוספת קלפים: " + ex.Message);
                return false;
            }
            finally
            {
                con.Close();
            }
        }
        /// <summary>
        /// מחזיר את כל קלפי המשחק עם המידע המלא (כולל צבעי צוותים)
        /// משמש בעיקר לשרת ולמערכות ניהול שזקוקות לכל המידע
        /// שונה מ-GetBoardForPlayer שמסתיר מידע לפי הרשאות
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <returns>רשימת כל הקלפים עם מידע מלא</returns>
        public List<Card> GetCardsForGame(int gameId)
        {
            List<Card> cards = new List<Card>();
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");
                
                SqlCommand cmd = new SqlCommand("sp_GetCardsForGame", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@GameID", gameId);

                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Card card = new Card
                    {
                        CardID = Convert.ToInt32(reader["CardID"]),
                        GameID = Convert.ToInt32(reader["GameID"]),
                        WordID = Convert.ToInt32(reader["WordID"]), // ✅ חדש
                        Word = reader["Word"].ToString(),           // ✅ נשמר בשביל הצגה
                        Team = reader["Team"].ToString(),
                        IsRevealed = Convert.ToBoolean(reader["IsRevealed"])
                    };

                    cards.Add(card);
                }

                return cards;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// מסמן קלף כחשוף במסד הנתונים
        /// נקרא כאשר שחקן או AI מנחש מילה ומגלה את הקלף
        /// פעולה בלתי הפיכה - אין אפשרות להסתיר קלף שנחשף
        /// </summary>
        /// <param name="cardId">מזהה הקלף לחשיפה</param>
        /// <returns>true אם הקלף נחשף בהצלחה</returns>
        public bool RevealCard(int cardId)
        {
            SqlConnection con = connect("myProjDB");

            SqlCommand cmd = new SqlCommand("UPDATE Cards SET IsRevealed = 1 WHERE CardID = @CardID", con);
            cmd.Parameters.AddWithValue("@CardID", cardId);

            int affected = cmd.ExecuteNonQuery();
            con.Close();

            return affected > 0;
        }

        /// <summary>
        /// מרשם שחקן למשחק עם בחירת צוות ותפקיד
        /// כולל אימותים שהמשחק פתוח להצטרפות ושיש מקום בצוות
        /// מפעיל stored procedure שמטפל בכל הלוגיקה העסקית
        /// </summary>
        /// <param name="player">פרטי השחקן להצטרפות</param>
        /// <returns>true אם ההצטרפות הצליחה</returns>
        public bool JoinGame(PlayerInGame player)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw ex;
            }

            try
            {
                Dictionary<string, object> paramDic = new Dictionary<string, object>
        {
            { "@GameID", player.GameID },
            { "@UserID", player.UserID },
            { "@Username", player.Username }, // ✅ הוספת שם משתמש להצטרפות
            { "@Team", player.Team },
            { "@IsSpymaster", player.IsSpymaster }
        };

                cmd = CreateCommandWithStoredProcedure("sp_JoinGame", con, paramDic);
                int affected = cmd.ExecuteNonQuery();
                return affected > 0;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// מוציא שחקן ממשחק ומנקה את פרטיו
        /// משמש כאשר שחקן עוזב במהלך שלב ההמתנה או במהלך המשחק
        /// מפעיל stored procedure שמטפל בניקוי הנתונים
        /// </summary>
        /// <param name="player">פרטי השחקן להוצאה</param>
        /// <returns>true אם השחקן הוצא בהצלחה</returns>
        public bool LeaveGame(PlayerInGame player)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw ex;
            }

            try
            {
                Dictionary<string, object> paramDic = new Dictionary<string, object>
        {
            { "@GameID", player.GameID },
            { "@UserID", player.UserID }
        };

                cmd = CreateCommandWithStoredProcedure("sp_DeletePlayerFromGame", con, paramDic);
                int affected = cmd.ExecuteNonQuery();
                
                return affected > 0;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }


        /// <summary>
        /// מעדכן פרטי שחקן במשחק (צוות, תפקיד, שם משתמש)
        /// משמש להחלפת צוותים או תפקידים לפני תחילת המשחק
        /// לא ניתן לעדכן במהלך משחק פעיל
        /// </summary>
        /// <param name="player">פרטי השחקן המעודכנים</param>
        /// <returns>true אם העדכון הצליח</returns>
        public bool UpdatePlayer(PlayerInGame player)
        {
            SqlConnection con = connect("myProjDB");

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@GameID", player.GameID },
        { "@UserID", player.UserID },
        { "@Username", player.Username }, // ✅ הוספת שם משתמש לעדכון
        { "@Team", player.Team },
        { "@IsSpymaster", player.IsSpymaster }
    };

            SqlCommand cmd = CreateCommandWithStoredProcedure("sp_UpdatePlayer", con, paramDic);
            int affected = cmd.ExecuteNonQuery();
            con.Close();

            return affected > 0;
        }
        //--------------------------------------------------------------------------------------------------
        // GAME
        //--------------------------------------------------------------------------------------------------

        /// <summary>
        /// מחזיר משחק ממתין שיצר המשתמש (אם קיים כזה)
        /// משמש למניעת יצירת משחקים מרובים על ידי אותו משתמש
        /// חלק מהלוגיקה העסקית למניעת זבל במסד הנתונים
        /// </summary>
        /// <param name="userId">מזהה המשתמש לבדיקה</param>
        /// <returns>אובייקט משחק ממתין או null אם אין</returns>
        public Game GetUserWaitingGame(string userId)
        {
            SqlConnection con = null;
            try
            {
                con = connect("myProjDB");
                SqlCommand cmd = new SqlCommand("sp_GetUserWaitingGame", con);
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@UserId", userId);

                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    Game game = new Game
                    {
                        GameID = Convert.ToInt32(reader["GameID"]),
                        CreatedBy = reader["CreatedBy"].ToString(),
                        CreationDate = Convert.ToDateTime(reader["CreationDate"]),
                        Status = reader["Status"].ToString(),
                        WinningTeam = reader["WinningTeam"] == DBNull.Value ? null : reader["WinningTeam"].ToString()
                    };
                    return game;
                }
                return null;
            }
            catch (Exception ex)
            {
                throw new Exception("❌ שגיאה בבדיקת משחק ממתין: " + ex.Message);
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// רושם ניחוש שחקן במסד הנתונים לצורכי סטטיסטיקות
        /// מתעד האם הניחוש היה נכון, שגוי, נייטרלי או מתנקש
        /// חשוב למעקב אחר ביצועי שחקנים וחישוב דירוגים
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="userId">מזהה השחקן שניחש</param>
        /// <param name="guessType">סוג הניחוש (correct/wrong/neutral/assassin)</param>
        /// <returns>true אם הרישום הצליח</returns>
        public bool LogPlayerGuess(int gameId, string userId, string guessType)
        {
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");

                Dictionary<string, object> paramDic = new Dictionary<string, object>
        {
            { "@GameID", gameId },
            { "@UserID", userId },
            { "@GuessType", guessType }
        };

                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_LogPlayerGuess", con, paramDic);
                int affected = cmd.ExecuteNonQuery();

                return affected > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ שגיאה ב־LogPlayerGuess: " + ex.Message);
                return false;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
     /// <summary>
     /// מחזיר סטטיסטיקות מפורטות על משחק ספציפי
     /// כולל ניחושים נכונים/שגויים לכל צוות, שחקן מצטיין וזמנים ממוצעים
     /// משמש לתצוגת סיכום המשחק ולניתוח ביצועים
     /// </summary>
     /// <param name="gameId">מזהה המשחק לחישוב סטטיסטיקות</param>
     /// <returns>אובייקט עם כל הסטטיסטיקות</returns>
     public GameStats GetGameStats(int gameId)
{
    SqlConnection con = connect("myProjDB");
    SqlCommand cmd = new SqlCommand("GetGameStatsFromPlayers", con);
    cmd.CommandType = CommandType.StoredProcedure;
    cmd.Parameters.AddWithValue("@GameID", gameId);

    GameStats stats = new GameStats();

    using (SqlDataReader reader = cmd.ExecuteReader())
    {
        // סטטיסטיקות קבוצתיות
        if (reader.Read())
        {
            stats.RedCorrectGuesses = reader.GetInt32(0);
            stats.RedIncorrectGuesses = reader.GetInt32(1);
            stats.BlueCorrectGuesses = reader.GetInt32(2);
            stats.BlueIncorrectGuesses = reader.GetInt32(3);
        }

        // שחקן מצטיין
        if (reader.NextResult() && reader.Read())
        {
            stats.BestPlayer = reader.IsDBNull(0) ? null : reader.GetString(0);
        }

        // זמן ממוצע
        if (reader.NextResult() && reader.Read())
        {
            if (!reader.IsDBNull(0) && double.TryParse(reader[0].ToString(), out double avg))
                stats.AvgTurnTimeSeconds = avg;
        }
    }

    con.Close();
    return stats;
}

        


        /// <summary>
        /// בודק האם משתמש יכול להצטרף למשחק ספציפי
        /// מאמת שהמשחק פתוח, לא מלא, והמשתמש לא כבר במשחק
        /// מפעיל stored procedure עם כל בדיקות ההרשאות
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="userId">מזהה המשתמש המבקש להצטרף</param>
        /// <returns>true אם ההצטרפות מותרת</returns>
        public bool IsGameJoinable(int gameId, string userId)
        {
            SqlConnection con = connect("myProjDB");

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@GameID", gameId },
        { "@UserID", userId }
    };

            SqlCommand cmd = CreateCommandWithStoredProcedure("sp_IsGameJoinable", con, paramDic);
            SqlDataReader reader = cmd.ExecuteReader();

            if (reader.Read())
            {
                return Convert.ToBoolean(reader["Joinable"]);
            }

            return false;
        }

        /// <summary>
        /// יוצר משחק חדש במסד הנתונים ומחזיר את מזהה המשחק
        /// מגדיר מצב התחלתי של "Waiting" ומזהה את יוצר המשחק
        /// משמש stored procedure עם פרמטר פלט לקבלת המזהה החדש
        /// </summary>
        /// <param name="game">אובייקט המשחק עם פרטי יוצר המשחק</param>
        /// <returns>מזהה המשחק החדש שנוצר</returns>
        public int CreateGame(Game game)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB"); // יצירת החיבור
            }
            catch (Exception ex)
            {
                throw ex;
            }

            try
            {
                cmd = new SqlCommand("sp_CreateGame", con);
                cmd.CommandType = CommandType.StoredProcedure;

                // קלט
                cmd.Parameters.AddWithValue("@CreatedBy", game.CreatedBy);

                // פלט
                SqlParameter outputParam = new SqlParameter("@GameID", SqlDbType.Int)
                {
                    Direction = ParameterDirection.Output
                };
                cmd.Parameters.Add(outputParam);

                cmd.ExecuteNonQuery();

                // החזרת GameID שנוצר
                return (int)outputParam.Value;
            }
            catch (Exception ex)
            {
                throw ex;
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }


        /// <summary>
        /// מעדכן את מצב המשחק (Waiting -> Active -> Finished)
        /// חלק ממחזור חיי המשחק - עוקב אחר התקדמות המשחק
        /// מצבים אפשריים: Waiting, Active, Finished
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="status">המצב החדש</param>
        /// <returns>true אם העדכון הצליח</returns>
        public bool UpdateGameStatus(int gameId, string status)
        {
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");

                Dictionary<string, object> paramDic = new Dictionary<string, object>
        {
            { "@GameID", gameId },
            { "@Status", status }
        };

                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_UpdateGameStatus", con, paramDic);
                cmd.ExecuteNonQuery();

                return true; // נחשב הצלחה גם אם לא שונה בפועל
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ שגיאה בעדכון סטטוס המשחק: " + ex.Message);
                return false;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// מעדכן את הצוות המנצח בסיום המשחק
        /// נקרא רק כאשר המשחק מסתיים עם מנצח ברור (Red או Blue)
        /// חלק חיוני ממערכת הסטטיסטיקות והדירוגים
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="winningTeam">שם הצוות המנצח</param>
        /// <returns>true אם העדכון הצליח</returns>
        public bool UpdateWinningTeam(int gameId, string winningTeam)
        {
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");

                Dictionary<string, object> paramDic = new Dictionary<string, object>
        {
            { "@GameID", gameId },
            { "@WinningTeam", winningTeam }
        };

                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_UpdateWinningTeam", con, paramDic);
                cmd.ExecuteNonQuery();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ שגיאה בעדכון קבוצה מנצחת: " + ex.Message);
                return false;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// בודק האם המשחק הסתיים (יש מנצח או סטטוס Finished)
        /// משמש למניעת פעולות על משחקים שהסתיימו
        /// חשוב למערכת ה-AI למניעת רמזים/ניחושים מיותרים
        /// </summary>
        /// <param name="gameId">מזהה המשחק לבדיקה</param>
        /// <returns>true אם המשחק הסתיים</returns>
        public bool IsGameFinished(int gameId)
        {
            SqlConnection con = null;

            try
            {
                con = connect("myProjDB");

                Dictionary<string, object> paramDic = new Dictionary<string, object>
                {
                    { "@GameID", gameId }
                };

                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_GetGameById", con, paramDic);
                SqlDataReader reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    string status = reader["Status"]?.ToString() ?? "";
                    string winningTeam = reader["WinningTeam"]?.ToString();
                    
                    reader.Close();
                    
                    // Game is finished if status is "Finished" or winningTeam is set
                    return status.Equals("Finished", StringComparison.OrdinalIgnoreCase) || 
                           !string.IsNullOrEmpty(winningTeam);
                }

                reader.Close();
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("❌ שגיאה בבדיקת סטטוס משחק: " + ex.Message);
                return false;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// מוסיף שחקן AI למשחק עם ולידציה מקיפה
        /// מחזיר קודי תוצאה שונים: הצלחה, כשל, משחק מלא וכו'
        /// משמש timeout מוגדל (30 שניות) לפעולות מורכבות
        /// </summary>
        /// <param name="player">פרטי שחקן ה-AI להוספה</param>
        /// <returns>קוד תוצאה: חיובי=הצלחה, שלילי=כשל עם קוד שגיאה</returns>
        public int AddAIPlayer(PlayerInGame player)
        {
            SqlConnection con = null;
            SqlDataReader reader = null;
            
            try
            {
                con = connect("myProjDB");

                Dictionary<string, object> paramDic = new Dictionary<string, object>
                {
                    { "@GameID", player.GameID },
                    { "@UserID", player.UserID },
                    { "@Username", player.Username },
                    { "@Team", player.Team },
                    { "@IsSpymaster", player.IsSpymaster }
                };

                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_AddAIPlayer", con, paramDic);
                
                // Increase timeout for this specific operation
                cmd.CommandTimeout = 30; // 30 seconds instead of default 10
                
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    int resultCode = Convert.ToInt32(reader["ResultCode"]);
                    return resultCode;
                }

                return -1; // קריאה לא תקינה
            }
            catch (Exception ex)
            {
                throw new Exception($"שגיאה בהוספת שחקן AI: {ex.Message}", ex);
            }
            finally
            {
                if (reader != null && !reader.IsClosed)
                {
                    reader.Close();
                }
                if (con != null && con.State == ConnectionState.Open)
                {
                    con.Close();
                }
            }
        }


        /// <summary>
        /// מסיר שחקן AI מהמשחק
        /// משמש כאשר משתמש מחליט להפסיק לשחק עם AI או לשנות הגדרות
        /// כולל timeout מוגדל להבטחת ביצוע מלא של הפעולה
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="userId">מזהה שחקן ה-AI להסרה</param>
        public void RemoveAIPlayer(int gameId, string userId)
        {
            SqlConnection con = null;
            try
            {
                con = connect("myProjDB");
                SqlCommand cmd = CreateCommandWithStoredProcedure("sp_RemoveAIPlayer", con,
                    new Dictionary<string, object>
                    {
                        { "@GameID", gameId },
                        { "@UserID", userId }
                    });
                
                // Increase timeout for this specific operation
                cmd.CommandTimeout = 30; // 30 seconds instead of default 10
                
                cmd.ExecuteNonQuery();
            }
            catch (Exception ex)
            {
                throw new Exception($"שגיאה בהסרת שחקן AI: {ex.Message}", ex);
            }
            finally
            {
                if (con != null && con.State == ConnectionState.Open)
                {
                    con.Close();
                }
            }
        }







        //--------------------------------------------------------------------------------------------------
        // USER
        //--------------------------------------------------------------------------------------------------
        /// <summary>
        /// רושם משתמש חדש במערכת עם אימות כפילות
        /// מוודא שכינוי המשתמש והאימייל לא קיימים כבר במערכת
        /// מחזיר הודעות שגיאה ברורות בעברית למשתמש
        /// </summary>
        /// <param name="user">פרטי המשתמש החדש</param>
        /// <returns>true אם הרישום הצליח</returns>
        public bool RegisterUserDB(server_codenames.BL.Users user)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB"); // Create the connection
            }
            catch (Exception ex)
            {
                // Log the exception
                throw new Exception("❌ Database connection failed.", ex);
            }

            // Dictionary to store parameters for the stored procedure
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@UserID", user.UserID },
        { "@Username", user.Username },
        { "@Email", user.Email }
    };

            cmd = CreateCommandWithStoredProcedure("RegisterUser", con, paramDic); // Execute the stored procedure

            try
            {
                int numEffected = cmd.ExecuteNonQuery();
                return numEffected > 0; // Return true if the user was successfully inserted
            }
            catch (SqlException ex)
            {
                if (ex.Message.Contains("Username already exists"))
                {
                    throw new Exception("⚠️ הכינוי כבר קיים במערכת. נסה כינוי אחר.");
                }
                else if (ex.Message.Contains("Email already exists"))
                {
                    throw new Exception("⚠️ האימייל כבר קיים במערכת. נסה להתחבר.");
                }
                else
                {
                    throw new Exception("❌ שגיאה בשרת. נסה שוב מאוחר יותר.", ex);
                }
            }
            finally
            {
                if (con != null)
                {
                    con.Close(); // Close the DB connection
                }
            }

        }
        /// <summary>
        /// בודק האם כינוי משתמש כבר קיים במערכת
        /// משמש לוולידציה בזמן אמת במהלך תהליך הרישום
        /// מונע רישום כפול ומספק חוויית משתמש חלקה
        /// </summary>
        /// <param name="username">כינוי המשתמש לבדיקה</param>
        /// <returns>true אם הכינוי כבר קיים</returns>
        public bool DoesUsernameExistDB(string username)
        {
            using (var connection = connect("myProjDB"))
            {
                Dictionary<string, object> paramUsername = new Dictionary<string, object>
        {
            { "@Username", username }
        };

                SqlCommand cmd = CreateCommandWithStoredProcedure("DoesUsernameExist", connection, paramUsername);
                int exists = (int)cmd.ExecuteScalar();
                return exists == 1; // ✅ Returns true if username exists, false otherwise
            }
        }

        /// <summary>
        /// מחזיר סטטיסטיקות מקיפות של משתמש ספציפי
        /// כולל נתונים על ניצחונות, הפסדים, דיוק ניחושים ומשחקים אחרונים
        /// משמש stored procedure שמחזיר מספר תוצאות (Summary + Recent Games)
        /// </summary>
        /// <param name="userId">מזהה המשתמש לחישוב סטטיסטיקות</param>
        /// <returns>אובייקט עם כל הסטטיסטיקות והמשחקים האחרונים</returns>
        public UserStats GetUserStatsDB(string userId)
        {
            using SqlConnection con = connect("myProjDB");

            var paramDic = new Dictionary<string, object> { { "@UserID", userId } };
            SqlCommand cmd = CreateCommandWithStoredProcedure("sp_UserGameStats", con, paramDic);

            using SqlDataReader rdr = cmd.ExecuteReader();

            var stats = new UserStats();

            // ------------ תוצאה ① – Summary ------------
            if (rdr.Read())
            {
                stats.GamesPlayed = rdr.GetInt32(0);
                stats.Wins = rdr.GetInt32(1);
                stats.WinRatePct = (double)rdr.GetDecimal(2);
                stats.Correct = rdr.GetInt32(3);
                stats.Wrong = rdr.GetInt32(4);
                stats.Assassin = rdr.GetInt32(5);
                stats.TimesSpymaster = rdr.GetInt32(6);
            }

            // ------------ תוצאה ② – Recent Games ------------
            if (rdr.NextResult())
            {
                while (rdr.Read())
                {
                    stats.RecentGames.Add(new RecentGame
                    {
                        Date = rdr.GetDateTime(0),
                        Team = rdr.GetString(1),
                        Role = rdr.GetString(2),
                        Result = rdr.GetString(3),
                        Correct = rdr.GetInt32(4),
                        Wrong = rdr.GetInt32(5),
                        Assassin = rdr.GetInt32(6)
                    });
                }
            }

            return stats;
        }


        //--------------------------------------------------------------------------------------------------
        // FRIENDS
        //--------------------------------------------------------------------------------------------------
        /// <summary>
        /// מחפש משתמש לפי שם משתמש או מזהה למטרת הוספה לרשימת חברים
        /// תומך בחיפוש גמיש - יכול לקבל שם משתמש או מזהה ייחודי
        /// משמש במערכת החברים לאיתור משתמשים להוספה
        /// </summary>
        /// <param name="query">שם משתמש או מזהה לחיפוש</param>
        /// <returns>אובייקט משתמש או null אם לא נמצא</returns>
        public server_codenames.BL.Users GetUserByUsernameOrID_DB(string query)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw new Exception("❌ שגיאה בחיבור למסד הנתונים.", ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@Query", query }
    };

            cmd = CreateCommandWithStoredProcedure("GetUserByUsernameOrID", con, paramDic);

            try
            {
                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    server_codenames.BL.Users user = new server_codenames.BL.Users
                    {
                        UserID = reader["UserID"].ToString(),
                        Username = reader["Username"].ToString(),
                        Email = reader["Email"].ToString(),
                        RegistrationDate = Convert.ToDateTime(reader["RegistrationDate"])
                    };
                    return user;
                }
                return null;
            }
            catch (Exception ex)
            {
                throw new Exception("❌ שגיאה בקריאת נתוני המשתמש.", ex);
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// שולח בקשת חברות למשתמש אחר
        /// יוצר רשומה ממתינה במסד הנתונים ומחזיר סטטוס התוצאה
        /// מטפל במצבים שונים: הצלחה, משתמש לא קיים, בקשה כפולה וכו'
        /// </summary>
        /// <param name="senderId">מזהה השולח</param>
        /// <param name="receiverQuery">מזהה או שם המקבל</param>
        /// <returns>מחרוזת סטטוס המתארת את תוצאת הפעולה</returns>
        public string SendFriendRequestDB(string senderId, string receiverQuery)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("❌ Failed to connect: " + ex.Message);
                throw new Exception("Database connection failed.", ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@SenderID", senderId },
        { "@ReceiverQuery", receiverQuery }
    };

            cmd = CreateCommandWithStoredProcedure("SendFriendRequest", con, paramDic);

            try
            {
                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        string result = reader["Result"].ToString();
                        System.Diagnostics.Debug.WriteLine("📥 Result from SQL: " + result);
                        return result;
                    }
                }

                return "NoResponse";
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("❌ SQL Error: " + ex.Message);
                throw;
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                    System.Diagnostics.Debug.WriteLine("🔄 Connection closed.");
                }
            }
        }

        /// <summary>
        /// מחזיר רשימת בקשות חברות שהמשתמש שלח ועדיין ממתינות לתשובה
        /// מסייע למשתמש לעקוב אחר בקשות שטרם אושרו או נדחו
        /// חלק ממערכת ניהול החברים המקיפה
        /// </summary>
        /// <param name="senderId">מזהה המשתמש ששלח את הבקשות</param>
        /// <returns>רשימת משתמשים שאליהם נשלחו בקשות ממתינות</returns>
        public List<server_codenames.BL.Users> GetPendingFriendRequestsSent(string senderId)
        {
            SqlConnection con;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw new Exception("נכשל להתחבר למסד הנתונים.", ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@SenderID", senderId }
    };

            cmd = CreateCommandWithStoredProcedure("GetPendingFriendRequestsSent", con, paramDic);

            List<server_codenames.BL.Users> pending = new List<server_codenames.BL.Users>();

            try
            {
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    server_codenames.BL.Users u = new server_codenames.BL.Users
                    {
                        UserID = reader["ReceiverID"].ToString(),
                        Username = reader["Username"].ToString(),
                        Email = reader["Email"].ToString()
                    };
                    pending.Add(u);
                }

                return pending;
            }
            catch (Exception ex)
            {
                throw new Exception("שגיאה בקריאת בקשות החברות שנשלחו.", ex);
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }


        /// <summary>
        /// מחזיר רשימת בקשות חברות שהתקבלו וממתינות לאישור המשתמש
        /// מציג למשתמש מי רוצה להיות חבר שלו
        /// חלק מתהליך אישור/דחיית בקשות חברות
        /// </summary>
        /// <param name="receiverId">מזהה המשתמש המקבל</param>
        /// <returns>רשימת משתמשים ששלחו בקשות חברות</returns>
        public List<server_codenames.BL.Users> GetPendingFriendRequestsReceived_DB(string receiverId)
        {
            SqlConnection con;
            SqlCommand cmd;
            List<server_codenames.BL.Users> users = new List<server_codenames.BL.Users>();

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw new Exception("Database connection failed.", ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@ReceiverID", receiverId }
    };

            cmd = CreateCommandWithStoredProcedure("GetPendingFriendRequestsReceived", con, paramDic);

            try
            {
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    server_codenames.BL.Users u = new server_codenames.BL.Users
                    {
                        UserID = reader["UserID"].ToString(),
                        Username = reader["Username"].ToString(),
                        Email = reader["Email"].ToString()
                    };
                    users.Add(u);
                }
                return users;
            }
            catch (Exception ex)
            {
                throw new Exception("Failed to fetch pending friend requests.", ex);
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        /// <summary>
        /// מבטל או דוחה בקשת חברות
        /// תומך בפעולות שונות: ביטול על ידי השולח, דחיה על ידי המקבל
        /// מעדכן את סטטוס הבקשה במסד הנתונים בהתאם
        /// </summary>
        /// <param name="senderId">מזהה השולח</param>
        /// <param name="receiverId">מזהה המקבל</param>
        /// <param name="action">סוג הפעולה (cancel/decline)</param>
        /// <returns>מחרוזת סטטוס המתארת את תוצאת הפעולה</returns>
        public string CancelFriendRequestDB(string senderId, string receiverId, string action)
        {
            SqlConnection con;
            SqlCommand cmd;

            try { con = connect("myProjDB"); }
            catch (Exception ex) { throw new Exception("DB connection failed", ex); }

            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SenderID", senderId },
                { "@ReceiverID", receiverId },
                { "@Action", action }
            };

            cmd = CreateCommandWithStoredProcedure("CancelFriendRequest", con, paramDic);

            try
            {
                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    return reader["Result"].ToString();
                }
                return "Error";
            }
            catch (Exception ex)
            {
                throw new Exception("❌ Failed to cancel/decline request", ex);
            }
            finally { if (con != null) con.Close(); }
        }

        /// <summary>
        /// מאשר בקשת חברות ויוצר חברות דו-כיוונית במסד הנתונים
        /// מבצע שתי פעולות: מעדכן סטטוס בקשה ויוצר קשר חברות
        /// כולל לוגים מפורטים לצורכי דיבוג ומעקב
        /// </summary>
        /// <param name="senderID">מזהה השולח המקורי</param>
        /// <param name="receiverID">מזהה המאשר את הבקשה</param>
        /// <returns>מחרוזת סטטוס המתארת את תוצאת הפעולה</returns>
        public string AcceptFriendRequestAndInsertFriendship(string senderID, string receiverID)
        {
            Debug.WriteLine("==> DB Start: AcceptFriendRequestAndInsertFriendship");
            Debug.WriteLine("SenderID: " + senderID);
            Debug.WriteLine("ReceiverID: " + receiverID);

            SqlConnection con = connect("myProjDB"); // already opened here

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@SenderID", senderID);
            paramDic.Add("@ReceiverID", receiverID);

            SqlCommand cmd = CreateCommandWithStoredProcedure("AcceptFriendRequestAndInsertFriendship", con, paramDic);

            try
            {
                string result = "Error";

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        result = reader["Result"].ToString();
                        Debug.WriteLine("==> DB RESULT: " + result);
                    }
                    else
                    {
                        Debug.WriteLine("==> DB RESULT: NO ROWS RETURNED");
                    }
                }

                Debug.WriteLine("==> DB FINAL RESULT TO RETURN: " + result);
                return result;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("==> DB ERROR: " + ex.Message);
                return "Error";
            }
            finally
            {
                con.Close();
            }
        }

        /// <summary>
        /// מחזיר רשימת כל החברים של משתמש ספציפי
        /// כולל פרטים על שם משתמש, אימייל ותאריך תחילת החברות
        /// משמש לתצוגת רשימת החברים באפליקציה
        /// </summary>
        /// <param name="userId">מזהה המשתמש</param>
        /// <returns>רשימת dictionary עם פרטי כל חבר</returns>
        public List<Dictionary<string, object>> GetFriendsByUserID(string userId)
        {
            Debug.WriteLine("==> DB Start: GetFriendsByUserID for userId = " + userId);

            SqlConnection con = connect("myProjDB");
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@UserID", userId);

            SqlCommand cmd = CreateCommandWithStoredProcedure("GetFriendsByUserID", con, paramDic);

            try
            {
                List<Dictionary<string, object>> results = new List<Dictionary<string, object>>();

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        Dictionary<string, object> row = new Dictionary<string, object>();
                        row["UserID"] = reader["UserID"].ToString();
                        row["Username"] = reader["Username"].ToString();
                        row["Email"] = reader["Email"].ToString();
                        row["FriendshipDate"] = Convert.ToDateTime(reader["FriendshipDate"]).ToString("yyyy-MM-dd");

                        results.Add(row);
                    }
                }

                Debug.WriteLine("==> DB GetFriendsByUserID: Found " + results.Count + " friends.");
                return results;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("==> DB ERROR GetFriendsByUserID: " + ex.Message);
                return new List<Dictionary<string, object>>();
            }
            finally
            {
                con.Close();
            }
        }

        /// <summary>
        /// מוחק חברות קיימת ומעדכן את הסטטוס להסרת חברות
        /// מבצע שתי פעולות: מוחק את רשומת החברות ומעדכן היסטוריה
        /// כולל לוגים מפורטים לצורכי מעקב ודיבוג
        /// </summary>
        /// <param name="userId">מזהה המשתמש המבקש להסיר</param>
        /// <param name="friendId">מזהה החבר להסרה</param>
        /// <returns>מחרוזת סטטוס המתארת את תוצאת הפעולה</returns>
        public string RemoveFriendshipAndUpdateStatus(string userId, string friendId)
        {
            Debug.WriteLine("==> DB Start: RemoveFriendshipAndUpdateStatus");
            Debug.WriteLine("UserID: " + userId);
            Debug.WriteLine("FriendID: " + friendId);

            SqlConnection con = connect("myProjDB");
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@UserID", userId);
            paramDic.Add("@FriendID", friendId);

            SqlCommand cmd = CreateCommandWithStoredProcedure("RemoveFriendshipAndUpdateStatus", con, paramDic);

            try
            {
                string result = "Error";

                using (SqlDataReader reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        result = reader["Result"].ToString();
                        Debug.WriteLine("==> DB RESULT: " + result);
                    }
                    else
                    {
                        Debug.WriteLine("==> DB RESULT: NO ROWS RETURNED");
                    }
                }

                Debug.WriteLine("==> DB FINAL RESULT TO RETURN: " + result);
                return result;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("==> DB ERROR: " + ex.Message);
                return "Error";
            }
            finally
            {
                con.Close();
            }
        }

        //---------------------------------------------------------------------------------
        // Turn
        //---------------------------------------------------------------------------------

        /// <summary>
        /// מעביר את התור לצוות הבא ויוצר תור חדש במסד הנתונים
        /// מטפל במצבים שונים: יצירת תור חדש, תור קיים, קונפליקטים
        /// מחזיר קודי תוצאה שונים לפי מצב המערכת
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="currentTeam">הצוות שמסיים את התור</param>
        /// <returns>מזהה התור החדש או null במקרה של כשל</returns>
        public int? SwitchTurn(int gameId, string currentTeam)
        {
            SqlConnection con = connect("myProjDB");

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@GameID", gameId },
        { "@CurrentTeam", currentTeam }
    };

            SqlCommand cmd = CreateCommandWithStoredProcedure("sp_SwitchTurn", con, paramDic);
            object result = cmd.ExecuteScalar();
            con.Close();

            if (result == null) return null;

            if (int.TryParse(result.ToString(), out int parsed))
            {
                if (parsed > 0)
                {
                    Console.WriteLine("✅ תור חדש נוצר בהצלחה: TurnID = " + parsed);
                    return parsed;
                }
                else if (parsed == -1)
                {
                    Console.WriteLine("⚠️ תור פתוח עדיין קיים – הפעולה בוטלה.");
                    return null;
                }
                else if (parsed == -2)
                {
                    Console.WriteLine("⏳ תור נפתח ממש עכשיו ע״י מישהו אחר – ממתינים...");
                    return null;
                }
                else
                {
                    Console.WriteLine("❌ שגיאה לא ידועה: ערך לא צפוי הוחזר מה־SP");
                    return null;
                }
            }

            Console.WriteLine("❌ לא ניתן להמיר את תוצאת SP למספר שלם.");
            return null;
        }



        /// <summary>
        /// פותח תור חדש עבור צוות ספציפי
        /// משמש לתחילת המשחק או לפתיחת תור ראשון
        /// מוודא שאין תור פתוח כבר קיים לפני יצירת חדש
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <param name="team">הצוות שמתחיל את התור</param>
        /// <returns>מזהה התור החדש או null אם יש תור פתוח</returns>
        public int? StartTurn(int gameId, string team)
        {
            SqlConnection con = connect("myProjDB");

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@GameID", gameId },
        { "@Team", team }
    };

            SqlCommand cmd = CreateCommandWithStoredProcedure("sp_StartTurn", con, paramDic);
            object result = cmd.ExecuteScalar();
            con.Close();

            if (result == null) return null;

            if (int.TryParse(result.ToString(), out int parsed))
            {
                if (parsed > 0)
                    return parsed;
                else
                {
                    Console.WriteLine("⚠️ שגיאה: קיים כבר תור פתוח ולא ניתן להתחיל חדש.");
                    return null;
                }
            }

            return null;
        }
    
        /// <summary>
        /// סוגר את התור האחרון הפתוח במשחק
        /// מסמן את התור כמוגמר ומעדכן זמני סיום
        /// חלק מתהליך ניהול התורות במשחק
        /// </summary>
        /// <param name="gameId">מזהה המשחק</param>
        /// <returns>true אם התור נסגר בהצלחה</returns>
        public bool EndLatestTurn(int gameId)
        {
            SqlConnection con = connect("myProjDB");

            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@GameID", gameId }
    };

            SqlCommand cmd = CreateCommandWithStoredProcedure("sp_EndLatestTurn", con, paramDic);
            int affected = cmd.ExecuteNonQuery();
            con.Close();

            return affected > 0;
        }
                //--------------------------------------------------------------------------------------------------
        // MOVES
        //--------------------------------------------------------------------------------------------------
/// <summary>
/// רושם מהלך שחקן במסד הנתונים לצורכי מעקב וניתוח
/// מתעד כל ניחוש עם פרטים על השחקן, המילה והתוצאה
/// חיוני לחישוב סטטיסטיקות ולניתוח דפוסי משחק
/// </summary>
/// <param name="move">פרטי המהלך לרישום</param>
/// <returns>true אם המהלך נרשם בהצלחה</returns>
public bool LogMove(MoveRequest move)
{
    SqlConnection con = connect("myProjDB");

    try
    {
        Dictionary<string, object> paramDic = new Dictionary<string, object>
        {
            { "@GameID", move.GameID },
            { "@TurnID", move.TurnID },
            { "@UserID", move.UserID },
            { "@WordID", move.WordID },
            { "@Result", move.Result }
        };

        SqlCommand cmd = CreateCommandWithStoredProcedure("sp_LogMove", con, paramDic);
        int affected = cmd.ExecuteNonQuery();
        return affected > 0;
    }
    catch (Exception ex)
    {
        Console.WriteLine("❌ שגיאה בלוג מהלך: " + ex.Message);
        return false;
    }
    finally
    {
        con.Close();
    }
}




        /// <summary>
        /// יוצר פקודת SQL עם stored procedure ופרמטרים
        /// פונקציה עזר מרכזית שמשמשת את כל הפונקציות במחלקה
        /// מגדיר timeout של 30 שניות ומוסיף פרמטרים באופן אוטומטי
        /// </summary>
        /// <param name="spName">שם ה-stored procedure</param>
        /// <param name="con">חיבור פתוח למסד הנתונים</param>
        /// <param name="paramDic">dictionary עם פרמטרים או null</param>
        /// <returns>פקודת SQL מוכנה לביצוע</returns>
        private SqlCommand CreateCommandWithStoredProcedure(String spName, SqlConnection con, Dictionary<string, object> paramDic)
        {

            SqlCommand cmd = new SqlCommand(); // create the command object

            cmd.Connection = con;              // assign the connection to the command object

            cmd.CommandText = spName;      // can be Select, Insert, Update, Delete 

            cmd.CommandTimeout = 30;           // Time to wait for the execution' Increased from 10 to 30 seconds

            cmd.CommandType = System.Data.CommandType.StoredProcedure; // the type of the command, can also be text

            //check if Dictionary not null and add to cmd
            if (paramDic != null)
                foreach (KeyValuePair<string, object> param in paramDic)
                {
                    cmd.Parameters.AddWithValue(param.Key, param.Value);

                }
            return cmd;
        }
    }
}

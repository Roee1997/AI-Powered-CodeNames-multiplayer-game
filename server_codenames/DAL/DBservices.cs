using server_codenames.BL;
using System.Data.SqlClient;
using System.Data;
using server_codenames.Controllers;
using System.Diagnostics;

namespace Server_codenames.DAL
{
    public class DBservices
    {
        public SqlDataAdapter da;
        public DataTable dt;

        public DBservices()
        {
            //
            // TODO: Add constructor logic here
            //
        }
        //--------------------------------------------------------------------------------------------------
        // This method creates a connection to the database according to the connectionString name in the web.config 
        //--------------------------------------------------------------------------------------------------
        public SqlConnection connect(String conString)
        {

            // read the connection string from the configuration file
            IConfigurationRoot configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json").Build();
            string cStr = configuration.GetConnectionString("myProjDB");
            SqlConnection con = new SqlConnection(cStr);
            con.Open();
            return con;
        }

 //--------------------------------------------------------------------------------------------------
        // stats
        //--------------------------------------------------------------------------------------------------

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
        // ✅ בדיקה אם משתמש הוא לוחש
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
        // ✅ Get Board For Player (Spymaster sees teams, Agent only revealed)
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

        public bool RevealCard(int cardId)
        {
            SqlConnection con = connect("myProjDB");

            SqlCommand cmd = new SqlCommand("UPDATE Cards SET IsRevealed = 1 WHERE CardID = @CardID", con);
            cmd.Parameters.AddWithValue("@CardID", cardId);

            int affected = cmd.ExecuteNonQuery();
            con.Close();

            return affected > 0;
        }

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
        //find user to add to friend list
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

        //create a pending friend request
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

        //get pending friend requests to users that I sent them.
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

        // Gets list of friends for a given user UID
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

        // Removes a friend and updates last FriendRequest to 'Unfriended'
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




        //---------------------------------------------------------------------------------
        // Create the SqlCommand using a stored procedure
        //---------------------------------------------------------------------------------
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

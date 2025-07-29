using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class Game
    {
        public int? GameID { get; set; }              // נוצר אוטומטית ע"י SQL
        public string CreatedBy { get; set; }         // חובה
        public DateTime? CreationDate { get; set; }   // ברירת מחדל מהשרת
        public string? Status { get; set; }           // נשלח מהקליינט או מוקצה בשרת
        public string? WinningTeam { get; set; }      // null עד לניצחון

        public Game() { }

        public Game(int gameID, string createdBy, DateTime creationDate, string status, string winningTeam)
        {
            GameID = gameID;
            CreatedBy = createdBy;
            CreationDate = creationDate;
            Status = status;
            WinningTeam = winningTeam;
        }

        public int CreateGame()
        {
            DBservices dbs = new DBservices();
            
            // Check if user already has a waiting game
            Game existingWaitingGame = dbs.GetUserWaitingGame(this.CreatedBy);
            if (existingWaitingGame != null)
            {
                // Return the existing waiting game ID instead of creating a new one
                return existingWaitingGame.GameID.Value;
            }
            
            return dbs.CreateGame(this);
        }

        public static Game GetUserWaitingGame(string userId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetUserWaitingGame(userId);
        }

        public bool IsGameJoinable(int gameId, string userId)
        {
            DBservices dbs = new DBservices();
            return dbs.IsGameJoinable(gameId, userId);
        }

        public bool UpdateGameStatus(int gameId, string status)
        {
            DBservices dbs = new DBservices();
            return dbs.UpdateGameStatus(gameId, status);

        }

        public bool UpdateWinningTeam(int gameId, string winningTeam)
        {
            DBservices dbs = new DBservices();
            return dbs.UpdateWinningTeam(gameId, winningTeam);
        }

        public bool IsGameFinished(int gameId)
        {
            DBservices dbs = new DBservices();
            return dbs.IsGameFinished(gameId);
        }
    }
}

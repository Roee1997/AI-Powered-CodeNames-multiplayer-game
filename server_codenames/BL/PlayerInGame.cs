using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class PlayerInGame
    {
        public int GameID { get; set; }
        public string UserID { get; set; }
        public string Username { get; set; } // ✅ חדש: שם משתמש לתצוגה בלובי
        public string Team { get; set; }
        public bool IsSpymaster { get; set; }

        public PlayerInGame() { }

        public PlayerInGame(int gameID, string userID, string username, string team, bool isSpymaster)
        {
            GameID = gameID;
            UserID = userID;
            Username = username;
            Team = team;
            IsSpymaster = isSpymaster;
        }

        public bool UpdatePlayer()
        {
            DBservices dbs = new DBservices();
            return dbs.UpdatePlayer(this);
        }

        public bool JoinGame()
        {
            DBservices dbs = new DBservices();
            return dbs.JoinGame(this);
        }

        public bool LeaveGame()
        {
            DBservices dbs = new DBservices();
            return dbs.LeaveGame(this);
        }


        public static List<PlayerInGame> GetPlayersInGame(int gameId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetPlayersInGame(gameId);
        }

        public int AddAIPlayer()
        {
            DBservices dbs = new DBservices();
            return dbs.AddAIPlayer(this);
        }

        public static void RemoveAIPlayer(int gameId, string userId)
        {
            DBservices dbs = new DBservices();
            dbs.RemoveAIPlayer(gameId, userId);
        }

    }
}

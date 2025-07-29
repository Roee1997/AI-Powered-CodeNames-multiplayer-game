using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class GameStatsManager
    {
        public GameStats GetGameStats(int gameId)
        {
            DBservices db = new DBservices();
            return db.GetGameStats(gameId);
        }
    }
}
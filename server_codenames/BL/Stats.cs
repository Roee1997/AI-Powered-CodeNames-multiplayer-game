using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class Stats
    {
        public string UserId { get; set; }

        public Stats(string userId)
        {
            UserId = userId;
        }

        public AIStatsDto GetAIStats()
        {
            DBservices db = new DBservices();
            return db.GetAIStatsForUser(UserId);
        }
    }
}

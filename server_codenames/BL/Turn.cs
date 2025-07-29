using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class Turn
    {
        public int? TurnID { get; set; }           // אופציונלי - מזהה ייחודי
        public int GameID { get; set; }            // מזהה משחק
        public string Team { get; set; }           // הקבוצה: "Red" או "Blue"
        public DateTime? StartTime { get; set; }   // זמן התחלת התור (לא חובה לשליחה)
        public DateTime? EndTime { get; set; }     // זמן סיום התור (אם הסתיים)

        public Turn() { }

        public Turn(int gameId, string team)
        {
            GameID = gameId;
            Team = team;
        }

        public int? Start()
        {
            DBservices dbs = new DBservices();
            return dbs.StartTurn(GameID, Team);
        }

        public bool EndLatest()
        {
            DBservices dbs = new DBservices();
            return dbs.EndLatestTurn(GameID);
        }

        public int? Switch()
        {
            DBservices dbs = new DBservices();
            return dbs.SwitchTurn(GameID, Team);
        }
    }
}
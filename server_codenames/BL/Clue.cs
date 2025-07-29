using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class Clue
    {
        public int GameID { get; set; }
        public int TurnID { get; set; }
        public string UserID { get; set; }
        public string Team { get; set; }
        public string ClueWord { get; set; }
        public int ClueNumber { get; set; }
    
        public int DurationInSeconds { get; set; }

        public bool Save()
        {
            DBservices dbs = new DBservices();
            return dbs.SaveClue(this);
        }
    }
}

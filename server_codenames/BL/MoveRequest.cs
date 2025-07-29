using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class MoveRequest
    {
        public int GameID { get; set; }
        public int TurnID { get; set; }
        public string UserID { get; set; }
        public int WordID { get; set; }
        public string Result { get; set; } // לדוג' "Correct", "Opponent", "Neutral", "Assassin"
    }
}

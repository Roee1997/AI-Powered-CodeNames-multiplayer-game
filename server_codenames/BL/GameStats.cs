using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class PlayerStats
    {
        public string Username { get; set; }
        public string Role { get; set; }           // "Agent" או "Spymaster"
        public string Team { get; set; }           // "Red" או "Blue"
        public int CorrectGuesses { get; set; }
        public int IncorrectGuesses { get; set; }
    }

    public class GameStats
{
    public int RedCorrectGuesses { get; set; }
    public int RedIncorrectGuesses { get; set; }
    public int BlueCorrectGuesses { get; set; }
    public int BlueIncorrectGuesses { get; set; }

    public string BestPlayer { get; set; }
    public double? AvgTurnTimeSeconds { get; set; }
}
}

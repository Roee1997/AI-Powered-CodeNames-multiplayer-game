using Server_codenames.DAL;

namespace server_codenames.BL
{
    public class Card
    {
        public int CardID { get; set; }
        public int GameID { get; set; }
        public int WordID { get; set; } // ✅ חדש
        public string Word { get; set; } // ✅ כדי להעביר ללקוח
        public string Team { get; set; }
        public bool IsRevealed { get; set; } = false;

        public Card() { }

     public static List<Card> GenerateBoard(int gameId, string gameType = "classic")
{
    DBservices dbs = new DBservices();

    string language = gameType == "scientific" ? "en" : "he";

    List<(int WordID, string Word)> words = dbs.GetRandomWords(25, language);

    if (words.Count < 25)
        throw new Exception("❌ אין מספיק מילים ליצירת לוח");

    // בחירה אקראית של הקבוצה שמתחילה (מקבלת 9 קלפים)
    var random = new Random();
    string startingTeam = random.Next(2) == 0 ? "Red" : "Blue";
    string secondTeam = startingTeam == "Red" ? "Blue" : "Red";

    var roles = new List<string>();
    
    // הקבוצה המתחילה מקבלת 9 קלפים
    for (int i = 0; i < 9; i++)
        roles.Add(startingTeam);
    
    // הקבוצה השנייה מקבלת 8 קלפים
    for (int i = 0; i < 8; i++)
        roles.Add(secondTeam);
    
    // 7 נייטרלים ומתנקש אחד
    for (int i = 0; i < 7; i++)
        roles.Add("Neutral");
    roles.Add("Assassin");

    var shuffledRoles = roles.OrderBy(r => random.Next()).ToList();

    List<Card> cards = new List<Card>();

    for (int i = 0; i < 25; i++)
    {
        cards.Add(new Card
        {
            GameID = gameId,
            WordID = words[i].WordID,
            Word = words[i].Word,
            Team = shuffledRoles[i],
            IsRevealed = false
        });
    }

    return cards;
}

        public static bool SaveBoardToDb(List<Card> board)
        {
            DBservices dbs = new DBservices();
            return dbs.InsertCards(board);
        }

        public static List<Card> GetCardsForGame(int gameId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetCardsForGame(gameId);
        }

        public static List<Card> GetBoardForPlayer(int gameId, string userId)
        {
            DBservices dbs = new DBservices();
            return dbs.GetBoardForPlayer(gameId, userId);
        }

        public static bool RevealCard(int cardId)
        {
            DBservices dbs = new DBservices();
            return dbs.RevealCard(cardId);
        }
    }
}

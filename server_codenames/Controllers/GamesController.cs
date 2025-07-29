using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;

namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class GamesController : ControllerBase
    {
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        [HttpPost("is-joinable")]
        public IActionResult IsGameJoinable([FromBody] JoinGameRequest request)
        {
            try
            {
                Game game = new Game();
                bool isJoinable = game.IsGameJoinable(request.GameId, request.UserId);

                return Ok(new { joinable = isJoinable });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{gameId}/board/{userId}")]
        public IActionResult GetBoardForPlayer(int gameId, string userId)
        {
            try
            {
                var cards = Card.GetBoardForPlayer(gameId, userId);
                return Ok(cards);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{gameId}/cards")]
        public IActionResult GetCardsForGame(int gameId)
        {
            try
            {
                List<Card> cards = Card.GetCardsForGame(gameId);
                return Ok(cards);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateGame([FromBody] Game game)
        {
            try
            {
                // Check if user already has a waiting game before creating
                Game existingWaitingGame = Game.GetUserWaitingGame(game.CreatedBy);
                bool isExistingGame = existingWaitingGame != null;
                
                int gameId = game.CreateGame();
                return Ok(new { GameID = gameId, IsExistingGame = isExistingGame });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

       [HttpPost("{gameId}/start")]
public IActionResult StartGame(int gameId, [FromBody] string gameType)
{
    try
    {
        if (Card.GetCardsForGame(gameId).Count > 0)
        {
            return BadRequest(new { message = "לוח כבר נוצר למשחק הזה" });
        }

        // שולח gameType ל־GenerateBoard
        var board = Card.GenerateBoard(gameId, gameType);

        bool success = Card.SaveBoardToDb(board);
        if (!success)
            return BadRequest(new { message = "שגיאה בשמירת לוח המשחק" });

        return Ok(new { message = "לוח נוצר בהצלחה", board });
    }
    catch (Exception ex)
    {
        Console.WriteLine("❌ שגיאה ביצירת לוח המשחק: " + ex.Message);
        return BadRequest(new { error = ex.Message });
    }
}


        [HttpPut("{gameId}/reveal/{cardId}")]
        public IActionResult RevealCard(int gameId, int cardId)
        {
            try
            {
                bool success = Card.RevealCard(cardId);
                if (!success)
                    return BadRequest(new { message = "הקלף לא נחשף" });

                return Ok(new { message = "הקלף נחשף בהצלחה" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
        [HttpPost("{gameId}/status")]
        public IActionResult UpdateGameStatus(int gameId, [FromBody] string status)
        {
            try
            {
                var validStatuses = new[] { "Waiting", "In Progress", "Finished" };
                if (!validStatuses.Contains(status))
                    return BadRequest(new { message = "סטטוס לא חוקי" });

                Game game = new Game();
                bool success = game.UpdateGameStatus(gameId, status);

                if (success)
                    return Ok(new { message = "סטטוס עודכן בהצלחה" });
                else
                    return StatusCode(500, new { message = "שגיאה בעדכון סטטוס המשחק" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }


        }
        [HttpPost("{gameId}/winner")]
        public IActionResult SetWinner(int gameId, [FromBody] string winningTeam)
        {
            try
            {
                var validTeams = new[] { "Red", "Blue" };
                if (!validTeams.Contains(winningTeam))
                    return BadRequest(new { message = "קבוצה לא חוקית" });

                Game game = new Game();
                bool success = game.UpdateWinningTeam(gameId, winningTeam);

                if (success)
                    return Ok(new { message = "הקבוצה המנצחת עודכנה" });
                else
                    return StatusCode(500, new { message = "שגיאה בעדכון הקבוצה המנצחת" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
        
[HttpGet("{gameId}/stats")]
public IActionResult GetGameStats(int gameId)
{
    GameStatsManager gm = new GameStatsManager(); // ✅ מחלקת ניהול
    GameStats stats = gm.GetGameStats(gameId);    // ✅ מביא מה-DB
    return Ok(stats);
}

    }
}

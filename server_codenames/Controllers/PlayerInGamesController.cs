using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;
using Server_codenames.DAL;
using System.Linq;

namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlayerInGamesController : ControllerBase
    {
        [HttpGet]
        public IEnumerable<string> Get()
        {
            return new string[] { "value1", "value2" };
        }

        [HttpGet("{gameId}/players")]
        public IActionResult GetPlayersInGame(int gameId)
        {
            try
            {
                List<PlayerInGame> players = PlayerInGame.GetPlayersInGame(gameId);
                return Ok(players);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("{gameId}/is-ready")]
        public IActionResult IsGameReady(int gameId)
        {
            try
            {
                List<PlayerInGame> players = PlayerInGame.GetPlayersInGame(gameId);

                if (players.Count != 4)
                    return Ok(new { isReady = false });

                var redTeam = players.Where(p => p.Team == "Red").ToList();
                var blueTeam = players.Where(p => p.Team == "Blue").ToList();

                bool redValid = redTeam.Count == 2 &&
                                redTeam.Any(p => p.IsSpymaster) &&
                                redTeam.Any(p => !p.IsSpymaster);

                bool blueValid = blueTeam.Count == 2 &&
                                 blueTeam.Any(p => p.IsSpymaster) &&
                                 blueTeam.Any(p => !p.IsSpymaster);

                bool isReady = redValid && blueValid;

                return Ok(new { isReady });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{gameId}/join")]
        public IActionResult JoinGame(int gameId, [FromBody] PlayerInGame player)
        {
            try
            {
                player.GameID = gameId;
                bool success = player.JoinGame();
                return success ? Ok(new { message = "הצטרפות הצליחה" }) : Ok(new { message = "השחקן כבר במשחק" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{gameId}/add-ai")]
        public IActionResult AddAIPlayer(int gameId, [FromBody] PlayerInGame player)
        {
            try
            {
                player.GameID = gameId;
                int resultCode = player.AddAIPlayer();

                switch (resultCode)
                {
                    case 3:
                        return StatusCode(201, new { message = "AI נוסף בהצלחה לשתי הטבלאות" });
                    case 2:
                        return Ok(new { message = "AI נוסף רק ל-PlayersInGame" });
                    case 1:
                        return Ok(new { message = "AI נוסף רק ל-Users" });
                    case 0:
                        return Conflict(new { message = "השחקן כבר קיים בשתי הטבלאות" });
                    default:
                        return StatusCode(500, new { message = "שגיאה לא צפויה בהוספת AI" });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "שגיאת שרת: " + ex.Message });
            }
        }



        [HttpDelete("{gameId}/remove-ai")]
        public IActionResult RemoveAIPlayer(int gameId, [FromBody] string userId)
        {
            try
            {
                DBservices dbs = new DBservices();
                dbs.RemoveAIPlayer(gameId, userId);
                return Ok(new { message = "שחקן AI הוסר בהצלחה" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "שגיאה במחיקת שחקן AI", details = ex.Message });
            }
        }






        // ✅ פעולה שנוספה בסניף develop – נשמרת
        [HttpDelete("leave")]
        public IActionResult LeaveGame([FromBody] LeaveGameRequest request)
        {
            try
            {
                PlayerInGame player = new PlayerInGame
                {
                    GameID = request.GameID,
                    UserID = request.UserID
                };

                bool success = player.LeaveGame();
                
                if (success)
                    return Ok(new { message = "השחקן הוסר מהמשחק" });
                else
                    return NotFound(new { message = "השחקן לא נמצא במשחק" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // Support for navigator.sendBeacon (POST method with FormData)
        [HttpPost("leave")]
        public IActionResult LeaveGamePost()
        {
            try
            {
                int gameID;
                string userID;
                
                // Check if it's FormData (from sendBeacon)
                if (Request.HasFormContentType)
                {
                    gameID = int.Parse(Request.Form["gameID"]);
                    userID = Request.Form["userID"];
                }
                else
                {
                    // Handle JSON (fallback)
                    using (StreamReader reader = new StreamReader(Request.Body))
                    {
                        string body = reader.ReadToEnd();
                        var data = System.Text.Json.JsonSerializer.Deserialize<LeaveGameRequest>(body);
                        gameID = data.GameID;
                        userID = data.UserID;
                    }
                }

                PlayerInGame player = new PlayerInGame
                {
                    GameID = gameID,
                    UserID = userID
                };

                bool success = player.LeaveGame();
                
                if (success)
                    return Ok(new { message = "השחקן הוסר מהמשחק" });
                else
                    return NotFound(new { message = "השחקן לא נמצא במשחק" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }


        public class LeaveGameRequest
        {
            public int GameID { get; set; }
            public string UserID { get; set; }
        }

        [HttpDelete("{gameId}/kick")]
        public IActionResult KickPlayer(int gameId, [FromBody] KickPlayerRequest request)
        {
            return ProcessKickRequest(gameId, request.CreatorUserID, request.TargetUserID);
        }

        // POST version for navigator.sendBeacon FormData
        [HttpPost("{gameId}/kick")]
        public IActionResult KickPlayerPost(int gameId, [FromForm] string creatorUserID, [FromForm] string targetUserID)
        {
            return ProcessKickRequest(gameId, creatorUserID, targetUserID);
        }

        private IActionResult ProcessKickRequest(int gameId, string creatorUserID, string targetUserID)
        {
            try
            {
                // Allow self-kicks (when user leaves voluntarily via צא מהקבוצה button)
                // Only prevent self-kicks if it's not the same user (creator kicking others)
                bool isSelfKick = creatorUserID == targetUserID;

                // Create player object and remove from game - using exact same logic as LeaveGame
                PlayerInGame playerToRemove = new PlayerInGame
                {
                    GameID = gameId,
                    UserID = targetUserID
                };

                bool success = playerToRemove.LeaveGame();
                
                if (success)
                {
                    string message = isSelfKick ? 
                        "יצאת מהקבוצה בהצלחה" : 
                        "השחקן הוסר מהמשחק על ידי יוצר החדר";
                    return Ok(new { message = message });
                }
                else
                    return NotFound(new { message = "השחקן לא נמצא במשחק" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        public class KickPlayerRequest
        {
            public string CreatorUserID { get; set; }
            public string TargetUserID { get; set; }
        }

        // ✅ פעולה שנוספה בסניף שלך – גם נשמרת
        [HttpPost("{gameId}/log-guess")]
        public IActionResult LogGuess(int gameId, [FromBody] GuessPayload payload)
        {
            try
            {
                if (string.IsNullOrEmpty(payload.UserID) || string.IsNullOrEmpty(payload.GuessType))
                    return BadRequest(new { error = "חסרים פרטים בגוף הבקשה" });

                DBservices dbs = new DBservices();
                bool success = dbs.LogPlayerGuess(gameId, payload.UserID, payload.GuessType.ToLower());

                return success
                    ? Ok(new { message = "המהלך נשמר בהצלחה" })
                    : Ok(new { message = "המהלך לא נרשם (אולי המשתמש הוא לוחש)" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPut("{gameId}/update-player")]
        public IActionResult UpdatePlayer(int gameId, [FromBody] PlayerInGame player)
        {
            try
            {
                if (player == null)
                    return BadRequest(new { error = "Player is null" });

                if (string.IsNullOrEmpty(player.UserID))
                    return BadRequest(new { error = "Missing UserID" });

                if (string.IsNullOrEmpty(player.Team))
                    return BadRequest(new { error = "Missing Team" });

                if (string.IsNullOrEmpty(player.Username))
                    return BadRequest(new { error = "Missing Username" });

                player.GameID = gameId;

                bool success = player.UpdatePlayer();

                return success
                    ? Ok(new { message = "עודכן בהצלחה" })
                    : Ok(new { message = "לא בוצע שינוי" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("{gameId}/replace-with-ai")]
        public IActionResult ReplacePlayerWithAI(int gameId, [FromBody] ReplaceWithAIRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.UserID))
                {
                    return BadRequest("Invalid request data");
                }

                // Generate AI player ID and name
                string aiId = $"ai-{DateTime.Now.Ticks}-{new Random().Next(1000, 9999)}";
                string aiName = $"AI {request.Team} {(request.IsSpymaster ? "לוחש" : "סוכן")} #{new Random().Next(1000, 9999)}";

                // Remove the disconnected player using existing method
                var disconnectedPlayer = new PlayerInGame(gameId, request.UserID, "", "", false);
                bool removeSuccess = disconnectedPlayer.LeaveGame();
                if (!removeSuccess)
                {
                    return BadRequest("Failed to remove disconnected player");
                }

                // Add AI replacement using existing method
                var aiPlayer = new PlayerInGame
                {
                    GameID = gameId,
                    UserID = aiId,
                    Username = aiName,
                    Team = request.Team,
                    IsSpymaster = request.IsSpymaster
                };

                bool addSuccess = aiPlayer.JoinGame();
                if (!addSuccess)
                {
                    return BadRequest("Failed to add AI replacement");
                }

                return Ok(new { 
                    message = "Player successfully replaced with AI", 
                    aiPlayerId = aiId,
                    aiPlayerName = aiName 
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class ReplaceWithAIRequest
    {
        public int GameID { get; set; }
        public string UserID { get; set; }
        public string Team { get; set; }
        public bool IsSpymaster { get; set; }
    }
}

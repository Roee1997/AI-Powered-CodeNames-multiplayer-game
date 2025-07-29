using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;
using Server_codenames.DAL;

namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TurnsController : ControllerBase
    {
        [HttpPost("switch")]
        public IActionResult SwitchTurn([FromBody] Turn request)
        {
            try
            {
                DBservices dbs = new DBservices();
                int? turnId = dbs.SwitchTurn(request.GameID, request.Team);

                if (turnId.HasValue)
                    return Ok(new { TurnID = turnId.Value });
                else
                    return BadRequest(new { message = "תור לא הועבר – ייתכן שכבר קיים תור פתוח" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "שגיאה בשרת", error = ex.Message });
            }
        }


        // התחלת תור
        [HttpPost("start")]
        public IActionResult StartTurn([FromBody] TurnStartRequest request)
        {
            Turn turn = new Turn(request.GameID, request.Team);
            int? turnId = turn.Start();

            if (turnId.HasValue)
                return Ok(new { message = "התור התחיל בהצלחה", TurnID = turnId.Value });

            else
                return StatusCode(500, new { message = "שגיאה בהתחלת תור" });
        }


        // סיום התור האחרון
        [HttpPut("end-latest/{gameId}")]
        public IActionResult EndLatestTurn(int gameId)
        {
            Turn turn = new Turn();
            turn.GameID = gameId;

            bool success = turn.EndLatest();

            if (success)
                return Ok(new { message = "התור הסתיים בהצלחה" });
            else
                return StatusCode(500, new { message = "שגיאה בסיום תור" });
        }

        public class TurnStartRequest
        {
            public int GameID { get; set; }
            public string Team { get; set; }
        }
    }
}

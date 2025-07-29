using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;

namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CluesController : ControllerBase
    {
        [HttpPost("save")]
        public IActionResult SaveClue([FromBody] Clue clue)
        {
            try
            {
                bool success = clue.Save();
                if (success)
                    return Ok(new { message = "הרמז נשמר בהצלחה" });
                else
                    return StatusCode(500, new { message = "שגיאה כללית בשמירת רמז" });
            }
            catch (Exception ex)
            {
                // נחזיר את השגיאה האמיתית ל־Swagger
                return StatusCode(500, new { message = "שגיאה בשמירת רמז", error = ex.Message });
            }
        }

    }
}

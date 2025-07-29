using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;
using Server_codenames.DAL;

namespace server_codenames.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StatsController : ControllerBase
    {
        [HttpGet("ai/{userId}")]
        public IActionResult GetAIStats(string userId)
        {
            try
            {
                Stats statsService = new Stats(userId);
                AIStatsDto stats = statsService.GetAIStats();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"שגיאה: {ex.Message}");
            }
        }
    }
}

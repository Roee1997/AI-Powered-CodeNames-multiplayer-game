using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;

namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MovesController : ControllerBase
    {
       [HttpPost("log")]
        public IActionResult LogMove([FromBody] MoveRequest move)
        {
            MoveManager manager = new MoveManager();
            bool success = manager.LogMove(move);
            return Ok(new { success });
        }
    }
}

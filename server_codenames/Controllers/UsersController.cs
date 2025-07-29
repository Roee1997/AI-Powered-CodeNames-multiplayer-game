using Microsoft.AspNetCore.Mvc;
using server_codenames.BL;
using Server_codenames.DAL;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace server_codenames.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class Users : ControllerBase
    {   
        // GET: api/<Users>
        [HttpGet("check-username/{username}")]
        public IActionResult CheckUsername(string username)
        {
            try
            {
                DBservices dbs = new DBservices();
                bool usernameExists = dbs.DoesUsernameExistDB(username);
                return usernameExists
                    ? BadRequest(new { message = "⚠️ הכינוי כבר קיים במערכת. נסה כינוי אחר." })
                    : Ok(new { message = "✅ כינוי זמין.." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "❌ שגיאה בשרת." });
            }
        }

        // GET api/<Users>/5
        [HttpGet("{id}")]
        public string Get(int id)
        {
            return "value";
        }

        [HttpGet("stats/{userId}")]
        public ActionResult<UserStats> GetUserStats(string userId)
        {
            try
            {
                var stats = UserStats.Load(userId);   // קריאה ישירה למחלקה
                if (stats == null || stats.GamesPlayed == 0)
                    return NotFound("לא נמצאו נתונים למשתמש");

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "❌ שגיאה בשרת: " + ex.Message);
            }
        }


        // POST api/<Users>
        [HttpPost("register")]
        public IActionResult RegisterUser([FromBody] BL.Users user)
        {
            try
            {
                bool isRegistered = user.RegisterUser();
                return isRegistered
                    ? Ok(new { message = "User registered successfully!" })
                    : BadRequest(new { message = "User registration failed!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT api/<Users>/5
        [HttpPut("{id}")]
        public void Put(int id, [FromBody] string value)
        {
        }

        // DELETE api/<Users>/5
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}

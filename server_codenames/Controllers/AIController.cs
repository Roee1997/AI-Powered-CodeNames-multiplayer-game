using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System.Data.SqlClient;
using System.Text.RegularExpressions;
using server_codenames.BL;

namespace server_codenames.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AIController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public AIController(IConfiguration configuration)
        {
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        public class ClueRequest
        {
            public List<string> TeamWords { get; set; }
            public List<string> AllBoardWords { get; set; }
            public List<string> RevealedWords { get; set; }
            public List<string> OpponentWords { get; set; }
            public string AssassinWord { get; set; }
            public int GameID { get; set; }
            public string Team { get; set; }
            public int TurnID { get; set; }
            public string AISpymasterUserID { get; set; }
            public long TurnStartTimestamp { get; set; }
            public List<string> PreviousClueWords { get; set; }
            public string CustomPrompt { get; set; }
        }

        [HttpPost("generate-clue")]
        public async Task<IActionResult> GenerateClue([FromBody] ClueRequest request)
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
                return BadRequest("Missing OpenAI API Key.");

            if (string.IsNullOrEmpty(request.AISpymasterUserID))
                return BadRequest("AISpymasterUserID חסר או ריק");

            // Check if game is already finished before generating clue
            Game game = new Game();
            if (game.IsGameFinished(request.GameID))
            {
                Console.WriteLine($"[AIController] 🛑 Game {request.GameID} is already finished - stopping AI clue generation");
                return BadRequest("המשחק כבר הסתיים - לא ניתן לייצר רמז");
            }

            Console.WriteLine($"[AIController] ▶ AISpymasterUserID = {request.AISpymasterUserID}");

            // רישום פירוט המילים שהתקבלו
            Console.WriteLine($"[AIController] 📥 Team Words ({request.TeamWords?.Count ?? 0}): {string.Join(", ", request.TeamWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Opponent Words ({request.OpponentWords?.Count ?? 0}): {string.Join(", ", request.OpponentWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Assassin Word: {request.AssassinWord ?? "N/A"}");
            Console.WriteLine($"[AIController] 📥 All Board Words ({request.AllBoardWords?.Count ?? 0}): {string.Join(", ", request.AllBoardWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Revealed Words ({request.RevealedWords?.Count ?? 0}): {string.Join(", ", request.RevealedWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Previous Clues ({request.PreviousClueWords?.Count ?? 0}): {string.Join(", ", request.PreviousClueWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Custom Prompt: {(string.IsNullOrEmpty(request.CustomPrompt) ? "None" : request.CustomPrompt)}");

            // בדיקה אם המילים באנגלית
            bool isScientific = request.TeamWords.Any(w => Regex.IsMatch(w, @"^[a-zA-Z]+$"));

            var prompt = BuildCluePrompt(
                request.TeamWords,
                request.AllBoardWords,
                request.RevealedWords,
                request.OpponentWords,
                request.AssassinWord,
                request.PreviousClueWords,
                isScientific,
                request.CustomPrompt
            );

            Console.WriteLine($"[AIController] 🤖 Generated Prompt Length: {prompt?.Length ?? 0} characters");
            Console.WriteLine($"[AIController] 🤖 Is Scientific Mode: {isScientific}");

            var requestBody = new
            {
                model = "gpt-4o",
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.7
            };

            // רישום ה-JSON המלא שנשלח ל-GPT
            var requestBodyJson = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions { WriteIndented = true });
            Console.WriteLine($"[AIController] 🚀 GPT Request Body:");
            Console.WriteLine($"[AIController] 🚀 {requestBodyJson}");

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);

            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, raw);

            var json = JsonDocument.Parse(raw);
            var resultText = json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?.Trim();

            Console.WriteLine($"[AIController] ✅ תשובת GPT: {resultText}");

            var parts = resultText?.Split(',');
            string clueWord = parts?[0].Trim() ?? "???";
            int clueCount = 1;

            if (parts?.Length > 1 && int.TryParse(parts[1].Trim(), out int parsedCount))
                clueCount = parsedCount;

            // אכיפת מגבלת מספר מהפרומפט המותאם
            if (!string.IsNullOrEmpty(request.CustomPrompt))
            {
                var customPromptLower = request.CustomPrompt.ToLower();
                
                // בדיקה אם המשתמש ביקש "רמז 1" או "מילה 1"
                if (customPromptLower.Contains("רמז ל-1") || 
                    customPromptLower.Contains("רמז 1") ||
                    customPromptLower.Contains("מילה 1") ||
                    customPromptLower.Contains("מילה אחת") ||
                    customPromptLower.Contains("1 מילה") ||
                    customPromptLower.Contains("clue 1") ||
                    customPromptLower.Contains("1 word"))
                {
                    clueCount = 1;
                    Console.WriteLine($"[AIController] 🔒 מגבלת מספר נאכפה: {clueCount}");
                }
                
                // בדיקה למספרים אחרים
                var match = System.Text.RegularExpressions.Regex.Match(customPromptLower, @"רמז ל[־\-]?(\d+)|(\d+)\s*מיל");
                if (match.Success)
                {
                    int requestedNumber = int.Parse(match.Groups[1].Value.Length > 0 ? match.Groups[1].Value : match.Groups[2].Value);
                    if (clueCount > requestedNumber)
                    {
                        clueCount = requestedNumber;
                        Console.WriteLine($"[AIController] 🔒 מגבלת מספר נאכפה: {clueCount} (מבוקש: {requestedNumber})");
                    }
                }
            }

            try
            {
                var duration = (int)((DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - request.TurnStartTimestamp) / 1000);
                var timestamp = DateTime.UtcNow;

                using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("myProjDB")))
                {
                    await con.OpenAsync();
                    using (SqlCommand cmd = new SqlCommand("sp_SaveClue", con))
                    {
                        cmd.CommandType = System.Data.CommandType.StoredProcedure;

                        cmd.Parameters.AddWithValue("@GameID", request.GameID);
                        cmd.Parameters.AddWithValue("@TurnID", request.TurnID);
                        cmd.Parameters.AddWithValue("@UserID", request.AISpymasterUserID);
                        cmd.Parameters.AddWithValue("@Team", request.Team);
                        cmd.Parameters.AddWithValue("@ClueWord", clueWord);
                        cmd.Parameters.AddWithValue("@ClueNumber", clueCount);
                        cmd.Parameters.AddWithValue("@DurationInSeconds", duration);

                        Console.WriteLine($"[AIController] 💾 שמירה ל-SQL: {clueWord}, {clueCount}, (⏱️ {duration}s)");
                        await cmd.ExecuteNonQueryAsync();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AIController] ❌ שגיאה בשמירת רמז ל־SQL: {ex.Message}");
                return StatusCode(500, $"שגיאה בשמירת רמז של AI ל־SQL: {ex.Message}");
            }

            return Ok(new { clue = clueWord, count = clueCount });
        }

        /// <summary>
        /// Builds AI clue prompt for spymaster
        /// </summary>
        private string BuildCluePrompt(
            List<string> teamWords,
            List<string> allWords,
            List<string> revealedWords,
            List<string> opponentWords,
            string assassinWord,
            List<string> previousClueWords,
            bool isScientific,
            string customPrompt = ""
        )
        {
            
            if (isScientific)
            {
                return $@"
You are the spymaster in a Codenames game.

Your goal is to help your team guess their words while avoiding opponents', revealed, and assassin words.

📌 Rules (follow exactly):
1. Your clue should clearly connect at least two of your team's words.
Only if no other option exists, you may give a clue for a single word.
2. Do not give a clue that appears in any board word.
3. Your clue should ideally be one word, but if it's more helpful, you may give a 2- or 3-word clue **if** it clearly links your team's words and avoids all forbidden words.
4. Do not give clues that relate to opponent words, revealed words, or the assassin.
5. Avoid repeating previous clues.

✅ Strategy:
- Prefer clues that connect 2–3 of your team's words.
- Prioritize safe, helpful clues over risky or overly thematic ones.

🌐 Your team's words: {string.Join(", ", teamWords)}
🛑 Opponent words: {string.Join(", ", opponentWords)}
☠️ Assassin word: {assassinWord}
🟡 Revealed words: {string.Join(", ", revealedWords)}
📋 All board words: {string.Join(", ", allWords)}
♻️ Previous clues: {string.Join(", ", previousClueWords ?? new List<string>())}

{(!string.IsNullOrEmpty(customPrompt) ? customPrompt : "")}

💬 Format your answer like this:
<clue>, <number>

Examples:
- rocket, 1  (relates to ""space"")
- fruit, 2   (relates to ""apple"" and ""banana"")
- animal, 3  (relates to ""dog"", ""cat"", and ""lion"")
";
            }

            return $@"
אתה הלוחש (Spymaster) במשחק Codenames.

המטרה שלך היא לעזור לקבוצה שלך לזהות את המילים שלה, מבלי לגרום להם לבחור מילים של היריב, מילים שכבר נחשפו, או את מילת המתנקש.

📌 כללים:
1. הרמז שלך צריך לחבר בצורה מובהקת לפחות 2 מילים של הקבוצה שלך.
רק אם אין שום אפשרות אחרת – מותר לתת רמז למילה אחת בלבד.
2. אסור לתת רמז שהוא מילה שמופיעה בלוח.
3. רצוי לתת רמז של מילה אחת – אך אם יש קשר טוב וברור, מותר גם 2 או 3 מילים (כל עוד הן בטוחות ולא קשורות למילים האסורות).
4. אסור לתת רמז שמתחבר למילים של היריב, מילים שנחשפו או מילת המתנקש.
5. אל תחזור על רמזים קודמים.

✅ אסטרטגיה:
- עדיף רמז שמחבר 2–3 מילים של הקבוצה.
- תמיד עדיף רמז בטוח, ברור ומדויק על פני רמז ""מתוחכם"" שמסכן את הקבוצה.

🟦 מילים של הקבוצה שלך: {string.Join(", ", teamWords)}  
🟥 מילים של היריב: {string.Join(", ", opponentWords)}  
☠️ מילת מתנקש: {assassinWord}  
🟡 מילים שנחשפו: {string.Join(", ", revealedWords)}  
📋 כל המילים בלוח: {string.Join(", ", allWords)}  
♻️ רמזים קודמים: {string.Join(", ", previousClueWords ?? new List<string>())}

{(!string.IsNullOrEmpty(customPrompt) ? customPrompt : "")}

📢 ענה בפורמט:
<רמז>, <מספר>

דוגמאות:
- חלל, 1 (מתאים ל""אסטרונאוט"")  
- פרי, 2 (מתאים ל""תפוח"" ו""בננה"")  
- חיה, 3 (מתאים ל""כלב"", ""חתול"" ו""נמר"")
";
        }

        public class GuessRequest
        {
            public string ClueWord { get; set; }
            public int ClueNumber { get; set; }
            public List<string> BoardWords { get; set; }
            public string Team { get; set; }
        }

        [HttpPost("guesses")]
        public async Task<IActionResult> GenerateGuesses([FromBody] GuessRequest request)
        {
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
                return BadRequest("Missing OpenAI API Key.");

            int maxGuesses = request.ClueNumber + 1;

            var prompt = $@"
אתה שחקן מנחש במשחק Codenames.

הרמז שקיבלת: {request.ClueWord} ({request.ClueNumber})
המילים שעל הלוח שעדיין לא נלחצו: {string.Join(", ", request.BoardWords)}

בחר **בדיוק** {maxGuesses} מילים שאתה חושב שהן קשורות לרמז. 
אם אתה לא בטוח לגבי חלק מהן – בחר פחות, אבל בשום מקרה אל תבחר יותר מ־{maxGuesses}.

רשום רק את המילים, מופרדות בפסיקים, לפי סדר הביטחון שלך.
**אל תכתוב הסברים. אל תכתוב טקסט נוסף. רק רשימה של מילים.**

לדוגמה:
חורף, שלג, קרח
";

            var requestBody = new
            {
                model = "gpt-4o",
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.5
            };

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);

            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, raw);

            var json = JsonDocument.Parse(raw);
            var resultText = json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?.Trim();

            var guesses = resultText?.Split(',')?.Select(w => w.Trim()).Where(w => !string.IsNullOrWhiteSpace(w)).ToList() ?? new();

            return Ok(new { guesses });
        }
    }
}

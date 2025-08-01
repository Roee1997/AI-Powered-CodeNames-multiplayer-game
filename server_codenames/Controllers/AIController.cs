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
    /// <summary>
    /// AI Controller - אחראי על כל פעולות הבינה המלאכותית במשחק Codenames
    /// מטפל בייצור רמזים חכמים ובניחושים אסטרטגיים באמצעות OpenAI GPT-4o
    /// כולל תמיכה בשני מצבים: עברית מסורתית ואנגלית מדעית עם ניתוח מתקדם
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AIController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        /// <summary>
        /// קונסטרקטור - מאתחל את שירותי ה-AI Controller
        /// מגדיר את ההגדרות והתקשורת עם OpenAI API
        /// </summary>
        /// <param name="configuration">הגדרות האפליקציה כולל OpenAI API Key</param>
        public AIController(IConfiguration configuration)
        {
            _configuration = configuration;
            _httpClient = new HttpClient();
        }

        /// <summary>
        /// מודל נתונים לבקשת ייצור רמז מה-AI
        /// מכיל את כל המידע הנדרש למערכת AI לייצר רמז אסטרטגי ובטוח
        /// </summary>
        public class ClueRequest
        {
            /// <summary>מילים של הקבוצה הנוכחית - מילים שה-AI צריך לעזור לזהות</summary>
            public List<string> TeamWords { get; set; }
            /// <summary>כל המילים על הלוח - הקשר המלא למשחק</summary>
            public List<string> AllBoardWords { get; set; }
            /// <summary>מילים שכבר נחשפו - להימנע מרמזים קשורים אליהן</summary>
            public List<string> RevealedWords { get; set; }
            /// <summary>מילים של הקבוצה המתחרה - חשוב להימנע מרמזים שיכולים להתייחס אליהן</summary>
            public List<string> OpponentWords { get; set; }
            /// <summary>מילת המתנקש - הכי חשוב להימנע ממנה!</summary>
            public string AssassinWord { get; set; }
            /// <summary>מזהה המשחק הנוכחי</summary>
            public int GameID { get; set; }
            /// <summary>שם הקבוצה (Red/Blue)</summary>
            public string Team { get; set; }
            /// <summary>מזהה התור הנוכחי</summary>
            public int TurnID { get; set; }
            /// <summary>מזהה המשתמש AI שמשמש כמרגל</summary>
            public string AISpymasterUserID { get; set; }
            /// <summary>זמן תחילת התור - לחישוב משך זמן מתן הרמז</summary>
            public long TurnStartTimestamp { get; set; }
            /// <summary>רמזים קודמים שניתנו - להימנע מחזרה</summary>
            public List<string> PreviousClueWords { get; set; }
            /// <summary>הנחיות מותאמות אישית מהמשתמש לסגנון ה-AI</summary>
            public string CustomPrompt { get; set; }
        }

        /// <summary>
        /// API Endpoint מרכזי לייצור רמזים חכמים על ידי AI
        /// פונקציה זו אחראית על כל תהליך הייצור: אימות, בניית פרומפט, קריאה ל-GPT, עיבוד תשובה ושמירה למסד נתונים
        /// תומכת בשני מצבי משחק: עברית קלאסית ואנגלית מדעית עם פרומפטים מותאמים
        /// כולל מנגנוני בטיחות למניעת רמזים מסוכנים ואכיפת מגבלות מותאמות אישית
        /// </summary>
        /// <param name="request">אובייקט המכיל את כל נתוני המשחק הדרושים לייצור הרמז</param>
        /// <returns>רמז ומספר מילים או שגיאה במקרה של כשל</returns>
        [HttpPost("generate-clue")]
        public async Task<IActionResult> GenerateClue([FromBody] ClueRequest request)
        {
            // שלב 1: אימות הגדרות בסיסיות - בדיקה שיש לנו גישה ל-OpenAI API
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
                return BadRequest("Missing OpenAI API Key.");

            // שלב 2: אימות שמזהה ה-AI Spymaster קיים ותקין
            if (string.IsNullOrEmpty(request.AISpymasterUserID))
                return BadRequest("AISpymasterUserID חסר או ריק");

            // שלב 3: בדיקת מצב המשחק - אם המשחק כבר הסתיים, אין צורך לייצר רמז
            Game game = new Game();
            if (game.IsGameFinished(request.GameID))
            {
                Console.WriteLine($"[AIController] 🛑 Game {request.GameID} is already finished - stopping AI clue generation");
                return BadRequest("המשחק כבר הסתיים - לא ניתן לייצר רמז");
            }

            Console.WriteLine($"[AIController] ▶ AISpymasterUserID = {request.AISpymasterUserID}");

            // שלב 4: רישום מפורט של כל נתוני הקלט - חשוב לדיבוג ומעקב אחר איכות הרמזים
            Console.WriteLine($"[AIController] 📥 Team Words ({request.TeamWords?.Count ?? 0}): {string.Join(", ", request.TeamWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Opponent Words ({request.OpponentWords?.Count ?? 0}): {string.Join(", ", request.OpponentWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Assassin Word: {request.AssassinWord ?? "N/A"}");
            Console.WriteLine($"[AIController] 📥 All Board Words ({request.AllBoardWords?.Count ?? 0}): {string.Join(", ", request.AllBoardWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Revealed Words ({request.RevealedWords?.Count ?? 0}): {string.Join(", ", request.RevealedWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Previous Clues ({request.PreviousClueWords?.Count ?? 0}): {string.Join(", ", request.PreviousClueWords ?? new List<string>())}");
            Console.WriteLine($"[AIController] 📥 Custom Prompt: {(string.IsNullOrEmpty(request.CustomPrompt) ? "None" : request.CustomPrompt)}");

            // שלב 5: זיהוי אוטומטי של סוג המשחק - עברית או אנגלית
            // בדיקה באמצעות Regex אם המילים כתובות באותיות לטיניות (אנגלית = מצב מדעי)
            bool isScientific = request.TeamWords.Any(w => Regex.IsMatch(w, @"^[a-zA-Z]+$"));

            // שלב 6: בניית פרומפט מותאם לסוג המשחק ולנתונים הספציפיים
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

            // שלב 7: הכנת בקשה ל-OpenAI GPT-4o
            // Temperature = 0.7 מאפשר איזון בין יצירתיות לעקביות
            var requestBody = new
            {
                model = "gpt-4o",
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.7
            };

            // רישום מפורט של הבקשה לדיבוג ומעקב
            var requestBodyJson = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions { WriteIndented = true });
            Console.WriteLine($"[AIController] 🚀 GPT Request Body:");
            Console.WriteLine($"[AIController] 🚀 {requestBodyJson}");

            // שלב 8: שליחת הבקשה ל-OpenAI API
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);

            // שלב 9: קריאת התשובה וטיפול בשגיאות
            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, raw);

            // שלב 10: עיבוד תשובת GPT וחילוץ הרמז
            var json = JsonDocument.Parse(raw);
            var resultText = json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?.Trim();

            Console.WriteLine($"[AIController] ✅ תשובת GPT: {resultText}");

            // שלב 11: פיענוח תשובת GPT - הפרדת הרמז למילה ומספר
            // הפורמט הצפוי: "רמז, מספר" או "clue, number"
            var parts = resultText?.Split(',');
            string clueWord = parts?[0].Trim() ?? "???";
            int clueCount = 1;

            // ניסיון לחלץ את המספר מהתשובה
            if (parts?.Length > 1 && int.TryParse(parts[1].Trim(), out int parsedCount))
                clueCount = parsedCount;

            // שלב 12: אכיפת מגבלות מותאמות אישית על מספר המילים
            // אם המשתמש ביקש מגבלה ספציפית בפרומפט המותאם, נכבד אותה
            if (!string.IsNullOrEmpty(request.CustomPrompt))
            {
                var customPromptLower = request.CustomPrompt.ToLower();
                
                // זיהוי בקשות לרמז למילה אחת בלבד (עברית ואנגלית)
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
                
                // זיהוי בקשות למספרים אחרים באמצעות ביטוי רגולרי
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

            // שלב 13: שמירת הרמז למסד הנתונים עם נתוני ביצועים
            try
            {
                // חישוב זמן התגובה של ה-AI מתחילת התור
                var duration = (int)((DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - request.TurnStartTimestamp) / 1000);
                var timestamp = DateTime.UtcNow;

                // שמירה למסד נתונים באמצעות stored procedure
                using (SqlConnection con = new SqlConnection(_configuration.GetConnectionString("myProjDB")))
                {
                    await con.OpenAsync();
                    using (SqlCommand cmd = new SqlCommand("sp_SaveClue", con))
                    {
                        cmd.CommandType = System.Data.CommandType.StoredProcedure;

                        // העברת כל הפרמטרים הנדרשים לשמירה
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
                // טיפול בשגיאות שמירה - חשוב לרשום ולהחזיר שגיאה מתאימה
                Console.WriteLine($"[AIController] ❌ שגיאה בשמירת רמז ל־SQL: {ex.Message}");
                return StatusCode(500, $"שגיאה בשמירת רמז של AI ל־SQL: {ex.Message}");
            }

            // שלב 14: החזרת הרמז הסופי ללקוח
            return Ok(new { clue = clueWord, count = clueCount });
        }

        /// <summary>
        /// בונה פרומפט מותאם אישית לייצור רמזים חכמים על ידי GPT-4o
        /// הפונקציה יוצרת שני סוגי פרומפטים: עברית מסורתית ואנגלית מדעית
        /// כולל כללי בטיחות מפורטים, אסטרטגיות משחק, ודוגמאות ברורות
        /// </summary>
        /// <param name="teamWords">מילים של הקבוצה שצריך לעזור לזהות</param>
        /// <param name="allWords">כל המילים על הלוח</param>
        /// <param name="revealedWords">מילים שכבר נחשפו</param>
        /// <param name="opponentWords">מילים של היריב - להימנע מהן</param>
        /// <param name="assassinWord">מילת המתנקש - הכי מסוכנת</param>
        /// <param name="previousClueWords">רמזים קודמים - להימנע מחזרה</param>
        /// <param name="isScientific">האם זה מצב מדעי (אנגלית) או מסורתי (עברית)</param>
        /// <param name="customPrompt">הנחיות מותאמות אישית מהמשתמש</param>
        /// <returns>פרומפט מלא ומפורט ל-GPT</returns>
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
            // בחירת הפרומפט המתאים לפי סוג המשחק
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

        /// <summary>
        /// מודל נתונים לבקשת ייצור ניחושים על ידי AI
        /// משמש כאשר שחקן AI מתפקד כ-Operative ומנסה לנחש מילים לפי רמז שניתן
        /// </summary>
        public class GuessRequest
        {
            /// <summary>הרמז שניתן על ידי המרגל</summary>
            public string ClueWord { get; set; }
            /// <summary>מספר המילים שהרמז מתייחס אליהן</summary>
            public int ClueNumber { get; set; }
            /// <summary>מילים זמינות על הלוח שעדיין לא נלחצו</summary>
            public List<string> BoardWords { get; set; }
            /// <summary>שם הקבוצה של השחקן המנחש</summary>
            public string Team { get; set; }
        }

        /// <summary>
        /// API Endpoint לייצור ניחושים חכמים על ידי AI Operative
        /// הפונקציה מקבלת רמז ומספר ומחזירה רשימת מילים מסודרת לפי רמת הביטחון
        /// כולל מגבלות בטיחות למניעת ניחושים מסוכנים מדי
        /// </summary>
        /// <param name="request">נתוני הרמז ומצב הלוח</param>
        /// <returns>רשימת ניחושים מסודרת לפי עדיפות</returns>
        [HttpPost("guesses")]
        public async Task<IActionResult> GenerateGuesses([FromBody] GuessRequest request)
        {
            // אימות גישה ל-OpenAI API
            var apiKey = _configuration["OpenAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
                return BadRequest("Missing OpenAI API Key.");

            // חישוב מספר הניחושים המקסימלי - רמז + 1 (כלל Codenames)
            int maxGuesses = request.ClueNumber + 1;

            // בניית פרומפט מפורט לניחוש מילים עם מגבלות בטיחות
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

            // הכנת בקשה ל-GPT עם temperature נמוכה יותר לניחושים מדויקים
            var requestBody = new
            {
                model = "gpt-4o",
                messages = new[] { new { role = "user", content = prompt } },
                temperature = 0.5  // נמוך יותר מאשר ברמזים לקבלת תשובות יותר עקביות
            };

            // הגדרת אימות לקריאת OpenAI API
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            // שליחת הבקשה ל-OpenAI
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", content);

            // טיפול בתשובה וטיפול בשגיאות
            var raw = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, raw);

            // חילוץ רשימת הניחושים מתשובת GPT
            var json = JsonDocument.Parse(raw);
            var resultText = json.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?.Trim();

            // עיבוד התשובה לרשימת מילים נקייה
            // פיצול לפי פסיקים, ניקוי רווחים, והסרת ערכים ריקים
            var guesses = resultText?.Split(',')?.Select(w => w.Trim()).Where(w => !string.IsNullOrWhiteSpace(w)).ToList() ?? new();

            return Ok(new { guesses });
        }
    }
}

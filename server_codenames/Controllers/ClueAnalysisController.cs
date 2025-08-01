using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using MathNet.Numerics.LinearAlgebra;
using System.Text;
using System.Text.Json;
using Accord.Statistics.Analysis;

/// <summary>
/// קונטרולר לניתוח רמזים ומילים במשחק Codenames באמצעות AI
/// מספק שירותי embedding, ניתוח איכות רמזים ומשוב על ניחושים
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ClueAnalysisController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    /// <summary>
    /// מטמון לשמירת embeddings שכבר נשלפו מ-OpenAI למהירות גישה
    /// </summary>
    private static readonly Dictionary<string, float[]> _embeddingCache = new Dictionary<string, float[]>();

    /// <summary>
    /// בונה את הקונטרולר ומאתחל חיבור ל-OpenAI API
    /// </summary>
    /// <param name="config">הגדרות התצורה כולל מפתח OpenAI</param>
    public ClueAnalysisController(IConfiguration config)
    {
        _config = config;

        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _config["OpenAI:ApiKey"]);
    }

    /// <summary>
    /// יוצר ניתוח embedding מפורט עם PCA לוויזואליזציה דו-ממדית
    /// מחשב דמיון קוסינוס ומרחק אוקלידי בין רמז למילים
    /// </summary>
    /// <param name="request">בקשת ניתוח המכילה רמז, ניחושים וכל המילים במשחק</param>
    /// <returns>תוצאות ניתוח עם וקטורים ודמיון למילים</returns>
    [HttpPost("generate")]
    public async Task<IActionResult> GenerateEmbeddingAnalysis([FromBody] AnalysisRequest request)
    {
        var allWords = new List<string>(request.AllWords);
        if (!allWords.Contains(request.Clue))
            allWords.Add(request.Clue);

        var embeddings = await GetEmbeddings(allWords);
        if (embeddings == null)
            return BadRequest("Failed to fetch embeddings from OpenAI");

        var clueVec = embeddings[request.Clue];
        var pcaResults = ApplyPCA(embeddings);

        var results = new List<WordVector>();

        foreach (var word in allWords)
        {
            var vec = embeddings[word];
            var (x, y) = pcaResults[word];
            double cosSim = CosineSimilarity(clueVec, vec);
            double euclid = EuclideanDistance(clueVec, vec);

            results.Add(new WordVector
            {
                Word = word,
                CosineSimilarity = cosSim,
                EuclideanDistance = euclid,
                IsClue = word == request.Clue,
                IsGuess = request.Guesses.Contains(word),
                X = x,
                Y = y
            });
        }

        var response = new AnalysisResponse
        {
            GameId = request.GameId,
            TurnId = request.TurnId,
            Team = request.Team,
            Clue = request.Clue,
            Guesses = request.Guesses,
            Vectors = results
        };

        return Ok(response);
    }

    /// <summary>
    /// שולף embeddings מ-OpenAI עם מטמון חכם למהירות וחיסכון בעלויות API
    /// בודק קודם אם מילים כבר קיימות במטמון לפני שליפה מחדש
    /// </summary>
    /// <param name="words">רשימת מילים לקבלת embeddings עבורן</param>
    /// <returns>מילון של מילים ל-embedding vectors או null אם שגיאה</returns>
    private async Task<Dictionary<string, float[]>> GetEmbeddings(List<string> words)
    {
        var embeddings = new Dictionary<string, float[]>();
        var wordsToFetch = new List<string>();

        // בדוק אילו מילים כבר יש במטמון
        lock (_embeddingCache)
        {
            foreach (var word in words)
            {
                if (_embeddingCache.ContainsKey(word))
                {
                    embeddings[word] = _embeddingCache[word];
                }
                else
                {
                    wordsToFetch.Add(word);
                }
            }
        }

        // אם יש מילים חדשות, שלוף אותן מ-OpenAI
        if (wordsToFetch.Count > 0)
        {
            Console.WriteLine($"[ClueAnalysis] 🚀 Fetching {wordsToFetch.Count} new embeddings from OpenAI");
            
            var content = new
            {
                input = wordsToFetch,
                model = "text-embedding-3-small"
            };

            var response = await _httpClient.PostAsync("https://api.openai.com/v1/embeddings",
                new StringContent(JsonSerializer.Serialize(content), Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode) 
            {
                Console.WriteLine($"[ClueAnalysis] ❌ OpenAI API error: {response.StatusCode}");
                return embeddings.Count > 0 ? embeddings : null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var parsed = JObject.Parse(json);

            lock (_embeddingCache)
            {
                for (int i = 0; i < wordsToFetch.Count; i++)
                {
                    var vector = parsed["data"]?[i]?["embedding"]?.Select(t => (float)t).ToArray();
                    if (vector != null)
                    {
                        embeddings[wordsToFetch[i]] = vector;
                        _embeddingCache[wordsToFetch[i]] = vector; // שמור במטמון
                    }
                }
            }

            Console.WriteLine($"[ClueAnalysis] ✅ Cached {wordsToFetch.Count} new embeddings");
        }
        else
        {
            Console.WriteLine($"[ClueAnalysis] 🎯 Using cached embeddings for all {words.Count} words - instant response!");
        }

        // לוג קצר על סטטוס אמבדינגים
        var foundWords = embeddings.Keys.ToList();
        var missingWords = words.Where(w => !embeddings.ContainsKey(w)).ToList();
        Console.WriteLine($"[ClueAnalysis] 📋 Embeddings: {foundWords.Count}/{words.Count} found");
        if (missingWords.Count > 0)
        {
            Console.WriteLine($"  ❌ Missing: {string.Join(", ", missingWords)}");
        }

        return embeddings;
    }

    /// <summary>
    /// מחשב דמיון קוסינוס בין שני וקטורים
    /// דמיון קוסינוס מוליד בין -1 (הפוך לחלוטין) ל-1 (זהה לחלוטין)
    /// כולל בדיקות תקינות למניעת שגיאות מחשבים
    /// </summary>
    /// <param name="vec1">וקטור ראשון</param>
    /// <param name="vec2">וקטור שני</param>
    /// <returns>דמיון קוסינוס בין הוקטורים (0-1)</returns>
    private double CosineSimilarity(float[] vec1, float[] vec2)
    {
        var v1 = Vector<float>.Build.DenseOfArray(vec1);
        var v2 = Vector<float>.Build.DenseOfArray(vec2);
        var dotProduct = v1.DotProduct(v2);
        var norm1 = v1.L2Norm();
        var norm2 = v2.L2Norm();
        
        // בדיקת תקינות הנתונים
        if (norm1 == 0 || norm2 == 0)
        {
            Console.WriteLine($"[ClueAnalysis] ⚠️ WARNING: Zero norm detected! norm1={norm1}, norm2={norm2}");
            return 0;
        }
        
        var similarity = dotProduct / (norm1 * norm2);
        
        // בדיקה שהערך בטווח התקין
        if (Double.IsNaN(similarity) || Double.IsInfinity(similarity))
        {
            Console.WriteLine($"[ClueAnalysis] ⚠️ WARNING: Invalid similarity detected! dotProduct={dotProduct}, norm1={norm1}, norm2={norm2}, result={similarity}");
            return 0;
        }
        
        return similarity;
    }

    /// <summary>
    /// מחשב מרחק אוקלידי בין שני וקטורים
    /// מרחק אוקלידי הוא המרחק הישר במרחב רב-ממדי
    /// </summary>
    /// <param name="vec1">וקטור ראשון</param>
    /// <param name="vec2">וקטור שני</param>
    /// <returns>מרחק אוקלידי בין הוקטורים</returns>
    private double EuclideanDistance(float[] vec1, float[] vec2)
    {
        double sum = 0;
        for (int i = 0; i < vec1.Length; i++)
            sum += Math.Pow(vec1[i] - vec2[i], 2);
        return Math.Sqrt(sum);
    }

    /// <summary>
    /// מיישם PCA (ניתוח רכיבים עיקריים) לצמצום ממדים ל-2D
    /// מצמצם את embeddings הרב-ממדיים לנקודות X,Y לתצוגה גרפית
    /// </summary>
    /// <param name="vectors">מילון של מילים ל-embedding vectors</param>
    /// <returns>מילון של מילים לקואורדינטות 2D (x,y)</returns>
    private Dictionary<string, (double x, double y)> ApplyPCA(Dictionary<string, float[]> vectors)
    {
        var wordList = vectors.Keys.ToList();
        double[][] data = vectors.Values
            .Select(vec => vec.Select(x => (double)x).ToArray())
            .ToArray();

        var pca = new PrincipalComponentAnalysis()
        {
            Method = PrincipalComponentMethod.Center,
            Whiten = false
        };

        pca.Learn(data);

        double[][] fullTransformed = pca.Transform(data);

        double[][] transformed = fullTransformed
            .Select(row => new double[] { row[0], row[1] })
            .ToArray();

        var result = new Dictionary<string, (double x, double y)>();
        for (int i = 0; i < wordList.Count; i++)
        {
            result[wordList[i]] = (transformed[i][0], transformed[i][1]);
        }

        return result;
    }

    /// <summary>
    /// מנתח איכות רמז ביחס למילים של הקבוצה, יריבים, ניטראליים ומתנקש
    /// מחשב ציון איכות עם קנסות ובונוסים ומספק המלצות
    /// </summary>
    /// <param name="request">בקשת ניתוח איכות רמז עם כל המילים הרלוונטיות</param>
    /// <returns>ציון איכות, דמיויות למילים והמלצות לשיפור</returns>
    [HttpPost("clue-quality")]
    public async Task<IActionResult> AnalyzeClueQuality([FromBody] ClueQualityRequest request)
    {
        Console.WriteLine($"[ClueAnalysis] 🎯 RECEIVED REQUEST:");
        Console.WriteLine($"  ClueWord: '{request.ClueWord}'");
        Console.WriteLine($"  TeamWords: {request.TeamWords?.Count ?? 0} words - [{string.Join(", ", request.TeamWords?.Take(3) ?? new List<string>())}...]");
        Console.WriteLine($"  OpponentWords: {request.OpponentWords?.Count ?? 0} words");
        Console.WriteLine($"  NeutralWords: {request.NeutralWords?.Count ?? 0} words");
        Console.WriteLine($"  AssassinWord: '{request.AssassinWord}'");
        
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            return BadRequest("Missing OpenAI API Key.");

        try
        {
            Console.WriteLine($"[ClueAnalysis] 🎯 Analyzing clue quality: {request.ClueWord}");

            // קבלת embeddings עבור כל המילים הרלוונטיות
            var wordsToAnalyze = new List<string> { request.ClueWord };
            wordsToAnalyze.AddRange(request.TeamWords);
            wordsToAnalyze.AddRange(request.OpponentWords);
            wordsToAnalyze.AddRange(request.NeutralWords);
            if (!string.IsNullOrEmpty(request.AssassinWord))
                wordsToAnalyze.Add(request.AssassinWord);
            
            wordsToAnalyze = wordsToAnalyze.Distinct().ToList();

            var embeddings = await GetEmbeddings(wordsToAnalyze);
            if (embeddings == null || !embeddings.ContainsKey(request.ClueWord))
            {
                return BadRequest("Could not generate embeddings for clue analysis.");
            }

            var clueEmbedding = embeddings[request.ClueWord];

            // חישוב דמיון לכל סוג מילה
            var teamSimilarities = request.TeamWords
                .Where(word => embeddings.ContainsKey(word))
                .Select(word => new { Word = word, Similarity = CosineSimilarity(clueEmbedding, embeddings[word]) })
                .OrderByDescending(x => x.Similarity)
                .ToList();

            var opponentSimilarities = request.OpponentWords
                .Where(word => embeddings.ContainsKey(word))
                .Select(word => new { Word = word, Similarity = CosineSimilarity(clueEmbedding, embeddings[word]) })
                .OrderByDescending(x => x.Similarity)
                .ToList();

            var neutralSimilarities = request.NeutralWords
                .Where(word => embeddings.ContainsKey(word))
                .Select(word => new { Word = word, Similarity = CosineSimilarity(clueEmbedding, embeddings[word]) })
                .OrderByDescending(x => x.Similarity)
                .ToList();

            // בדיקת דמיון למתנקש
            double assassinSimilarity = 0;
            if (!string.IsNullOrEmpty(request.AssassinWord) && embeddings.ContainsKey(request.AssassinWord))
            {
                assassinSimilarity = CosineSimilarity(clueEmbedding, embeddings[request.AssassinWord]);
            }

            // חישוב איכות הרמז
            var avgTeamSimilarity = teamSimilarities.Count > 0 ? teamSimilarities.Average(x => x.Similarity) : 0;
            var maxOpponentSimilarity = opponentSimilarities.Count > 0 ? opponentSimilarities.Max(x => x.Similarity) : 0;
            var maxNeutralSimilarity = neutralSimilarities.Count > 0 ? neutralSimilarities.Max(x => x.Similarity) : 0;

            // הוספת לוגים מפורטים לדיבאג
            Console.WriteLine($"[ClueAnalysis] 🔍 DEBUG VALUES:");
            Console.WriteLine($"  Team similarities count: {teamSimilarities.Count}");
            Console.WriteLine($"  avgTeamSimilarity: {avgTeamSimilarity:F4}");
            Console.WriteLine($"  maxOpponentSimilarity: {maxOpponentSimilarity:F4}");
            Console.WriteLine($"  maxNeutralSimilarity: {maxNeutralSimilarity:F4}");
            Console.WriteLine($"  assassinSimilarity: {assassinSimilarity:F4}");
            if (teamSimilarities.Count > 0)
            {
                Console.WriteLine($"  Top team similarities:");
                foreach (var sim in teamSimilarities.Take(3))
                {
                    Console.WriteLine($"    {sim.Word}: {sim.Similarity:F4}");
                }
            }

            // חישוב ציון איכות (0-100)
            var qualityScore = CalculateClueQuality(avgTeamSimilarity, maxOpponentSimilarity, maxNeutralSimilarity, assassinSimilarity);

            var result = new ClueQualityResponse
            {
                ClueWord = request.ClueWord,
                QualityScore = Math.Round(qualityScore, 1),
                TeamSimilarities = teamSimilarities.Take(3).Select(x => new WordSimilarity 
                { 
                    Word = x.Word, 
                    Similarity = Math.Round(x.Similarity, 3) 
                }).ToList(),
                HighestOpponentSimilarity = maxOpponentSimilarity > 0 ? Math.Round(maxOpponentSimilarity, 3) : 0,
                HighestNeutralSimilarity = maxNeutralSimilarity > 0 ? Math.Round(maxNeutralSimilarity, 3) : 0,
                AssassinSimilarity = Math.Round(assassinSimilarity, 3),
                RiskLevel = GetRiskLevel(qualityScore, assassinSimilarity),
                Suggestions = GetSimpleQualityMessage(qualityScore, assassinSimilarity, maxOpponentSimilarity) // הודעה פשוטה חדשה!
            };

            Console.WriteLine($"[ClueAnalysis] ✅ Quality analysis complete: {qualityScore:F1}% quality");
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ClueAnalysis] ❌ Error: {ex.Message}");
            return StatusCode(500, $"Analysis error: {ex.Message}");
        }
    }

    /// <summary>
    /// מחשב ציון איכות רמז מתוחכם עם קנסות ובונוסים
    /// ציון בסיסי מדמיון למילים של הקבוצה, עם קנסות על דמיון ליריבים ומתנקש
    /// </summary>
    /// <param name="avgTeamSim">דמיון ממוצע למילים של הקבוצה</param>
    /// <param name="maxOpponentSim">דמיון מקסימלי למילים של היריבים</param>
    /// <param name="maxNeutralSim">דמיון מקסימלי למילים ניטראליות</param>
    /// <param name="assassinSim">דמיון למילת המתנקש</param>
    /// <returns>ציון איכות בטווח 0-100</returns>
    private double CalculateClueQuality(double avgTeamSim, double maxOpponentSim, double maxNeutralSim, double assassinSim)
    {
        // ציון בסיסי מוגדל (0-150) לציונים גבוהים יותר
        var baseScore = Math.Min(avgTeamSim * 150, 150);
        
        // קנסות מופחתים לציונים גבוהים יותר
        var opponentPenalty = Math.Max(0, (maxOpponentSim - avgTeamSim)) * baseScore * 0.5; // הופחת מ-0.8
        var neutralPenalty = Math.Max(0, (maxNeutralSim - avgTeamSim * 0.5)) * baseScore * 0.4; // הופחת מ-0.6
        var assassinPenalty = assassinSim * baseScore * 0.3; // הופחת מ-0.4 - עדיין חמור אבל מתון יותר
        
        // הגבלת הקנסות (יחסית לציון הבסיס החדש)
        opponentPenalty = Math.Min(opponentPenalty, baseScore * 0.3);
        neutralPenalty = Math.Min(neutralPenalty, baseScore * 0.25);
        assassinPenalty = Math.Min(assassinPenalty, baseScore * 0.4);
        
        var finalScore = baseScore - opponentPenalty - neutralPenalty - assassinPenalty;
        
        // בונוס לקשרים חזקים מאוד (דמיון > 0.5)
        var strongConnectionBonus = 0.0;
        if (avgTeamSim > 0.5)
        {
            strongConnectionBonus = (avgTeamSim - 0.5) * 30; // עד 15 נקודות בונוס
            finalScore += strongConnectionBonus;
        }
        
        // הגבלה לטווח 0-100
        finalScore = Math.Max(0, Math.Min(100, finalScore));
        
        // לוגים מפורטים לדיבאג
        Console.WriteLine($"[ClueAnalysis] 📊 ENHANCED QUALITY CALCULATION:");
        Console.WriteLine($"  baseScore (avgTeamSim * 150): {avgTeamSim:F4} * 150 = {baseScore:F2}");
        Console.WriteLine($"  opponentPenalty (reduced): {opponentPenalty:F2}");
        Console.WriteLine($"  neutralPenalty (reduced): {neutralPenalty:F2}");
        Console.WriteLine($"  assassinPenalty (reduced): {assassinPenalty:F2}");
        Console.WriteLine($"  strongConnectionBonus: {strongConnectionBonus:F2}");
        Console.WriteLine($"  finalScore: {baseScore:F2} - {opponentPenalty:F2} - {neutralPenalty:F2} - {assassinPenalty:F2} + {strongConnectionBonus:F2} = {finalScore:F2}");
        Console.WriteLine($"  return value: {finalScore:F2}");
        
        return finalScore;
    }

    /// <summary>
    /// קובע רמת סיכון של רמז להת מתנקש או להעניק ליריבים
    /// </summary>
    /// <param name="qualityScore">ציון איכות כללי</param>
    /// <param name="assassinSim">דמיון למתנקש</param>
    /// <returns>רמת סיכון: high/medium/low</returns>
    private string GetRiskLevel(double qualityScore, double assassinSim)
    {
        if (assassinSim > 0.6) return "high";
        if (assassinSim > 0.4 || qualityScore < 30) return "medium";
        return "low";
    }

    /// <summary>
    /// יוצר הודעת איכות פשוטה וברורה לשחקן
    /// מתעדפת אזהרות מתנקש ויריבים על פני הערכת איכות כללית
    /// </summary>
    /// <param name="qualityScore">ציון איכות כללי</param>
    /// <param name="assassinSim">דמיון למתנקש</param>
    /// <param name="maxOpponentSim">דמיון מקסימלי ליריבים</param>
    /// <returns>הודעה מבוססת emoji עם משוב איכות</returns>
    private string GetSimpleQualityMessage(double qualityScore, double assassinSim, double maxOpponentSim)
    {
        // זהירות מתנקש - העדיפות הגבוהה ביותר (סף מופחת)
        if (assassinSim > 0.35)
            return "⚠️ זהירות! רמז מסוכן - דמיון למתנקש";
        
        // זהירות יריבים (סף מופחת)
        if (maxOpponentSim > 0.35)
            return "🔴 זהירות! דמיון חזק לקבוצה יריבה";
        
        // הערכת איכות כללית - ספים מופחתים להגיוניות
        if (qualityScore > 20)
            return "✅ רמז טוב!";
        else if (qualityScore > 10)
            return "🟡 רמז בסדר";
        else
            return "❌ רמז לא טוב";
    }

    /// <summary>
    /// יוצר המלצות מפורטות לשיפור רמזים במשחק
    /// מתמקד באזהרות מסיכונים והצעות לשיפור
    /// </summary>
    /// <param name="avgTeamSim">דמיון ממוצע למילים של הקבוצה</param>
    /// <param name="maxOpponentSim">דמיון מקסימלי ליריבים</param>
    /// <param name="assassinSim">דמיון למתנקש</param>
    /// <param name="qualityScore">ציון איכות כללי</param>
    /// <returns>המלצה מבוססת emoji לשיפור הרמז</returns>
    private string GenerateClueQualitySuggestions(double avgTeamSim, double maxOpponentSim, double assassinSim, double qualityScore)
    {
        if (assassinSim > 0.6)
            return "⚠️ רמז מסוכן! דמיון גבוה למתנקש";
        else if (maxOpponentSim > 0.7)
            return "⚠️ רמז עלול להועיל לקבוצה היריבה";
        else if (avgTeamSim < 0.3)
            return "💡 נסה רמז עם קשר חזק יותר למילים שלך";
        else if (qualityScore > 80)
            return "🎯 רמז מעולה! קשר חזק למילים שלך";
        else if (qualityScore > 60)
            return "✅ רמז טוב, אבל ייתכן שיש טובים יותר";
        else
            return "🤔 רמז בסדר, אבל שקול חלופות";
    }

    /// <summary>
    /// יוצר משוב מפורט על ניחוש שבוצע במשחק
    /// מחשב דמיון סמנטי, דירוג ומספק תובנות חכמות
    /// </summary>
    /// <param name="request">בקשת משוב ניחוש עם מילת רמז, ניחוש ותוצאה</param>
    /// <returns>דמיון סמנטי, דירוג ותובנות להמשך המשחק</returns>
    [HttpPost("guess-feedback")]
    public async Task<IActionResult> GenerateGuessFeedback([FromBody] GuessFeedbackRequest request)
    {
        var apiKey = _config["OpenAI:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
            return BadRequest("Missing OpenAI API Key.");

        try
        {
            Console.WriteLine($"[ClueAnalysis] 🎯 Analyzing guess: {request.GuessedWord} for clue: {request.ClueWord}");

            // קבלת embeddings עבור כל המילים הרלוונטיות
            var wordsToAnalyze = new List<string> { request.ClueWord, request.GuessedWord };
            wordsToAnalyze.AddRange(request.AllWords);
            wordsToAnalyze = wordsToAnalyze.Distinct().ToList();

            var embeddings = await GetEmbeddings(wordsToAnalyze);
            if (embeddings == null || !embeddings.ContainsKey(request.ClueWord) || !embeddings.ContainsKey(request.GuessedWord))
            {
                return BadRequest("Could not generate embeddings for analysis.");
            }

            var clueEmbedding = embeddings[request.ClueWord];
            var guessEmbedding = embeddings[request.GuessedWord];

            // חישוב דמיון קוסינוס
            var similarity = CosineSimilarity(clueEmbedding, guessEmbedding);

            // חישוב ranking של המילה הנבחרת (רק למילים הכי חשובות)
            var similarities = request.AllWords
                .Where(word => embeddings.ContainsKey(word))
                .Select(word => new { Word = word, Similarity = CosineSimilarity(clueEmbedding, embeddings[word]) })
                .OrderByDescending(x => x.Similarity)
                .Take(10) // מגביל ל-10 המילים המשמעותיות ביותר למהירות
                .ToList();

            // אם המילה שנבחרה לא בטופ 10, נמצא את המיקום שלה בנפרד
            var ranking = similarities.FindIndex(x => x.Word == request.GuessedWord) + 1;
            if (ranking == 0) {
                // המילה לא בטופ 10, נחשב משוער
                var guessedSimilarity = CosineSimilarity(clueEmbedding, guessEmbedding);
                var betterWords = request.AllWords
                    .Where(word => embeddings.ContainsKey(word))
                    .Count(word => CosineSimilarity(clueEmbedding, embeddings[word]) > guessedSimilarity);
                ranking = betterWords + 1;
            }

            // יצירת תובנה חכמה
            var insights = GenerateGuessInsights(request.GuessedWord, request.ClueWord, similarity, ranking, request.GuessResult);

            var result = new GuessFeedbackResponse
            {
                Similarity = Math.Round(similarity, 3),
                Ranking = ranking,
                TotalWords = request.AllWords.Count,
                Insights = insights,
                GuessResult = request.GuessResult
            };

            Console.WriteLine($"[ClueAnalysis] ✅ Analysis complete: {similarity:F3} similarity, rank {ranking}");
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ClueAnalysis] ❌ Error: {ex.Message}");
            return StatusCode(500, $"Analysis error: {ex.Message}");
        }
    }

    /// <summary>
    /// יוצר תובנות חכמות ומותאמות אישית על ניחוש שבוצע
    /// מסביר את הקשר הסמנטי בין הרמז לניחוש בשפה נגישה
    /// </summary>
    /// <param name="guessedWord">המילה שנוחשה</param>
    /// <param name="clueWord">מילת הרמז</param>
    /// <param name="similarity">דמיון סמנטי בין המילים</param>
    /// <param name="ranking">דירוג המילה ביחס לכל המילים</param>
    /// <param name="guessResult">תוצאת הניחוש (נכון/שגוי/מתנקש)</param>
    /// <returns>תובנה חכמה ומובנת על הניחוש</returns>
    private string GenerateGuessInsights(string guessedWord, string clueWord, double similarity, int ranking, string guessResult)
    {
        // תובנות מותאמות אישית בהתאם לדמיון ותוצאה
        if (similarity > 0.8)
        {
            return $"קשר סמנטי מאוד חזק בין '{clueWord}' ל-'{guessedWord}' - שניהם חולקים תחום משמעותי דומה";
        }
        else if (similarity > 0.6)
        {
            return $"קשר טוב בין המילים - רמזים כאלה בדרך כלל מובילים להצלחה";
        }
        else if (similarity > 0.4)
        {
            return $"קשר חלש בין '{clueWord}' ל-'{guessedWord}' - אולי הסתמכת על ידע או אסוציאציה אישית";
        }
        else
        {
            return $"דמיון נמוך במודל השפה - אולי חיבור לא צפוי או מקרי";
        }
    }
}

/// <summary>
/// מודל בקשה לניתוח embedding וויזואליזציה של רמז וניחושים
/// </summary>
public class AnalysisRequest
{
    /// <summary>מזהה ייחודי של המשחק</summary>
    public int GameId { get; set; }
    /// <summary>מזהה ייחודי של התור</summary>
    public int TurnId { get; set; }
    /// <summary>מילת הרמז שניתנה</summary>
    public string Clue { get; set; }
    /// <summary>שם הקבוצה (אדום/כחול)</summary>
    public string Team { get; set; }
    /// <summary>רשימת הניחושים שבוצעו</summary>
    public List<string> Guesses { get; set; }
    /// <summary>כל המילים במשחק לניתוח הקשר</summary>
    public List<string> AllWords { get; set; }
}

/// <summary>
/// מידע מפורט על מילה והוקטור שלה לצורך וויזואליזציה
/// </summary>
public class WordVector
{
    /// <summary>המילה עצמה</summary>
    public string Word { get; set; }
    /// <summary>דמיון קוסינוס לרמז (0-1)</summary>
    public double CosineSimilarity { get; set; }
    /// <summary>מרחק אוקלידי מהרמז</summary>
    public double EuclideanDistance { get; set; }
    /// <summary>האם זו מילת הרמז עצמה</summary>
    public bool IsClue { get; set; }
    /// <summary>האם זו מילה שנוחשה</summary>
    public bool IsGuess { get; set; }
    /// <summary>קואורדינט X לתצוגה 2D (מ-PCA)</summary>
    public double X { get; set; }
    /// <summary>קואורדינט Y לתצוגה 2D (מ-PCA)</summary>
    public double Y { get; set; }
}

/// <summary>
/// תוצאות ניתוח embedding עם כל המידע הנדרש לוויזואליזציה
/// </summary>
public class AnalysisResponse
{
    /// <summary>מזהה המשחק</summary>
    public int GameId { get; set; }
    /// <summary>מזהה התור</summary>
    public int TurnId { get; set; }
    /// <summary>שם הקבוצה</summary>
    public string Team { get; set; }
    /// <summary>מילת הרמז</summary>
    public string Clue { get; set; }
    /// <summary>רשימת הניחושים</summary>
    public List<string> Guesses { get; set; }
    /// <summary>כל המילים עם הנתונים המתמטיים שלהן</summary>
    public List<WordVector> Vectors { get; set; }
}

/// <summary>
/// מודל בקשה לקבלת משוב על ניחוש שבוצע במשחק
/// </summary>
public class GuessFeedbackRequest
{
    /// <summary>מזהה המשחק</summary>
    public int GameId { get; set; }
    /// <summary>המילה שנוחשה על ידי השחקן</summary>
    public string GuessedWord { get; set; }
    /// <summary>מילת הרמז שניתנה</summary>
    public string ClueWord { get; set; }
    /// <summary>כל המילים במשחק לחישוב דירוג</summary>
    public List<string> AllWords { get; set; }
    /// <summary>תוצאת הניחוש (נכון/שגוי/מתנקש)</summary>
    public string GuessResult { get; set; }
    /// <summary>שם הקבוצה</summary>
    public string Team { get; set; }
}

/// <summary>
/// תוצאות משוב על ניחוש עם נתונים מתמטיים ותובנות
/// </summary>
public class GuessFeedbackResponse
{
    /// <summary>דמיון סמנטי בין הרמז לניחוש (0-1)</summary>
    public double Similarity { get; set; }
    /// <summary>דירוג המילה ביחס לכל המילים</summary>
    public int Ranking { get; set; }
    /// <summary>סה״כ מילים במשחק</summary>
    public int TotalWords { get; set; }
    /// <summary>תובנות חכמות על הניחוש</summary>
    public string Insights { get; set; }
    /// <summary>תוצאת הניחוש המקורית</summary>
    public string GuessResult { get; set; }
}

/// <summary>
/// מודל בקשה לניתוח איכות רמז ביחס לכל המילים במשחק
/// </summary>
public class ClueQualityRequest
{
    /// <summary>מילת הרמז לבדיקה</summary>
    public string ClueWord { get; set; }
    /// <summary>מילים של הקבוצה שלך (חיובי)</summary>
    public List<string> TeamWords { get; set; }
    /// <summary>מילים של הקבוצה היריבה (שלילי)</summary>
    public List<string> OpponentWords { get; set; }
    /// <summary>מילים ניטראליות (לא שייכות לאחד)</summary>
    public List<string> NeutralWords { get; set; }
    /// <summary>מילת המתנקש (מסוכנת ביותר!)</summary>
    public string AssassinWord { get; set; }
}

/// <summary>
/// תוצאות ניתוח איכות רמז עם ציון, סיכונים והמלצות
/// </summary>
public class ClueQualityResponse
{
    /// <summary>מילת הרמז שנבדקה</summary>
    public string ClueWord { get; set; }
    /// <summary>ציון איכות כללי (0-100)</summary>
    public double QualityScore { get; set; }
    /// <summary>דמיויות למילים של הקבוצה (טופ 3)</summary>
    public List<WordSimilarity> TeamSimilarities { get; set; }
    /// <summary>דמיון הכי גבוה ליריבים</summary>
    public double HighestOpponentSimilarity { get; set; }
    /// <summary>דמיון הכי גבוה לניטראליים</summary>
    public double HighestNeutralSimilarity { get; set; }
    /// <summary>דמיון למתנקש - הפקטור החשוב ביותר!</summary>
    public double AssassinSimilarity { get; set; }
    /// <summary>רמת סיכון: low/medium/high</summary>
    public string RiskLevel { get; set; }
    /// <summary>המלצות והודעות לשחקן</summary>
    public string Suggestions { get; set; }
}

/// <summary>
/// דמיון בין מילה לרמז - לשימוש ברשימות דירוג
/// </summary>
public class WordSimilarity
{
    /// <summary>המילה</summary>
    public string Word { get; set; }
    /// <summary>דמיון סמנטי לרמז (0-1)</summary>
    public double Similarity { get; set; }
}

using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;
using MathNet.Numerics.LinearAlgebra;
using System.Text;
using System.Text.Json;
using Accord.Statistics.Analysis;

[ApiController]
[Route("api/[controller]")]
public class ClueAnalysisController : ControllerBase
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;
    private static readonly Dictionary<string, float[]> _embeddingCache = new Dictionary<string, float[]>();

    public ClueAnalysisController(IConfiguration config)
    {
        _config = config;

        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _config["OpenAI:ApiKey"]);
    }

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

    private double EuclideanDistance(float[] vec1, float[] vec2)
    {
        double sum = 0;
        for (int i = 0; i < vec1.Length; i++)
            sum += Math.Pow(vec1[i] - vec2[i], 2);
        return Math.Sqrt(sum);
    }

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

    private string GetRiskLevel(double qualityScore, double assassinSim)
    {
        if (assassinSim > 0.6) return "high";
        if (assassinSim > 0.4 || qualityScore < 30) return "medium";
        return "low";
    }

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

public class AnalysisRequest
{
    public int GameId { get; set; }
    public int TurnId { get; set; }
    public string Clue { get; set; }
    public string Team { get; set; }
    public List<string> Guesses { get; set; }
    public List<string> AllWords { get; set; }
}

public class WordVector
{
    public string Word { get; set; }
    public double CosineSimilarity { get; set; }
    public double EuclideanDistance { get; set; }
    public bool IsClue { get; set; }
    public bool IsGuess { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
}

public class AnalysisResponse
{
    public int GameId { get; set; }
    public int TurnId { get; set; }
    public string Team { get; set; }
    public string Clue { get; set; }
    public List<string> Guesses { get; set; }
    public List<WordVector> Vectors { get; set; }
}

public class GuessFeedbackRequest
{
    public int GameId { get; set; }
    public string GuessedWord { get; set; }
    public string ClueWord { get; set; }
    public List<string> AllWords { get; set; }
    public string GuessResult { get; set; }
    public string Team { get; set; }
}

public class GuessFeedbackResponse
{
    public double Similarity { get; set; }
    public int Ranking { get; set; }
    public int TotalWords { get; set; }
    public string Insights { get; set; }
    public string GuessResult { get; set; }
}

public class ClueQualityRequest
{
    public string ClueWord { get; set; }
    public List<string> TeamWords { get; set; }
    public List<string> OpponentWords { get; set; }
    public List<string> NeutralWords { get; set; }
    public string AssassinWord { get; set; }
}

public class ClueQualityResponse
{
    public string ClueWord { get; set; }
    public double QualityScore { get; set; }
    public List<WordSimilarity> TeamSimilarities { get; set; }
    public double HighestOpponentSimilarity { get; set; }
    public double HighestNeutralSimilarity { get; set; }
    public double AssassinSimilarity { get; set; }
    public string RiskLevel { get; set; }
    public string Suggestions { get; set; }
}

public class WordSimilarity
{
    public string Word { get; set; }
    public double Similarity { get; set; }
}

namespace server_codenames.BL
{
    public class AIStatsDto
    {
        public int TotalUserGuessesFromAIClues { get; set; }
        public int CorrectUserGuessesFromAIClues { get; set; }
        public double UserAccuracyFromAIClues { get; set; }

        public int TotalAIGuessesFromUserClues { get; set; }
        public int CorrectAIGuessesFromUserClues { get; set; }
        public double AIAccuracyFromUserClues { get; set; }
    }
}

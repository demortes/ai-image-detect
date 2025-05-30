public class ImageAnalysisLog
{
    public int Id { get; set; }
    public string ImageHash { get; set; } = default!;
    public string Rating { get; set; } = default!;
    public DateTime AnalyzedAt { get; set; }
}
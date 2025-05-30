public interface IImageAnalysisService
{
    Task<object> AnalyzeImageAsync(ImageAnalysisRequest request);
}
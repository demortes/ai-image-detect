using Microsoft.EntityFrameworkCore;

public class AIImageDetectDbContext : DbContext
{
    public DbSet<ImageAnalysisLog> ImageAnalysisLogs { get; set; } = default!;
}
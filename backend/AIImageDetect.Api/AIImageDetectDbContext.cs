using Microsoft.EntityFrameworkCore;

public class AIImageDetectDbContext : DbContext
{
    public AIImageDetectDbContext(DbContextOptions<AIImageDetectDbContext> options) : base(options)
    {
    }

    public DbSet<ImageAnalysisLog> ImageAnalysisLogs { get; set; } = default!;
}
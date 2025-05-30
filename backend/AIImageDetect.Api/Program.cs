using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();

// Add JWT authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://auth.demortes.com";
        options.Audience = "your-api-audience"; // Replace with your Authentik API audience/client-id
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "https://auth.demortes.com",
            ValidateAudience = true,
            ValidAudience = "your-api-audience", // Replace with your Authentik API audience/client-id
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true
            // You can add more validation parameters as needed
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddDbContext<AIImageDetectDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default"))); // Or your preferred DB

// Register services
builder.Services.AddScoped<IImageAnalysisService, ImageAnalysisService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Enable authentication/authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Image analysis endpoint
app.MapPost("/analyze-image",
    async (ImageAnalysisRequest request, IImageAnalysisService service) =>
        await service.AnalyzeImageAsync(request))
    .RequireAuthorization();

app.Run();

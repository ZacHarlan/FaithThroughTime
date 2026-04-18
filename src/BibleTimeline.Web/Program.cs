using BibleTimeline.Web.Data;
using BibleTimeline.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Database
var dbPath = Path.Combine(AppContext.BaseDirectory, "bible-timeline.db");
var connectionString = $"Data Source={dbPath}";
builder.Services.AddSingleton(new BibleTimelineDb(connectionString));

// CORS for development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// Initialize database
var initializer = new DatabaseInitializer(connectionString);
initializer.Initialize();

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();

// Map API endpoints
app.MapTimelineEndpoints();
app.MapPersonEndpoints();
app.MapEventEndpoints();
app.MapSearchEndpoints();
app.MapLineageEndpoints();
app.MapMapEndpoints();

app.Run();

// Make Program accessible for WebApplicationFactory in tests
public partial class Program { }

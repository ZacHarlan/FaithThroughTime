using BibleTimeline.Web.Data;
using BibleTimeline.Web.Endpoints;

// Export mode: --export-dataset <path> writes the dataset JSON and exits without starting the server.
var exportIdx = Array.IndexOf(args, "--export-dataset");
if (exportIdx >= 0)
{
    if (exportIdx + 1 >= args.Length)
    {
        Console.Error.WriteLine("--export-dataset requires an output path.");
        return 2;
    }
    var outPath = Path.GetFullPath(args[exportIdx + 1]);
    var exportConn = $"Data Source={Path.Combine(AppContext.BaseDirectory, "faith-through-time.db")}";
    new DatabaseInitializer(exportConn).Initialize();
    var exportDb = new BibleTimelineDb(exportConn);
    var bytes = await exportDb.GetDatasetJsonAsync();
    var dir = Path.GetDirectoryName(outPath);
    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
    await File.WriteAllBytesAsync(outPath, bytes);
    Console.WriteLine($"Wrote dataset ({bytes.Length / 1024.0:F1} KB) to {outPath}");
    return 0;
}

var builder = WebApplication.CreateBuilder(args);

// Database
var dbPath = Path.Combine(AppContext.BaseDirectory, "faith-through-time.db");
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
app.MapDatasetEndpoints();

app.Run();
return 0;

// Make Program accessible for WebApplicationFactory in tests
public partial class Program { }

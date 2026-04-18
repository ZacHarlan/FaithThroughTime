using System.Text.RegularExpressions;

namespace BibleTimeline.Tests;

/// <summary>
/// Architecture enforcement tests — mechanically verify layer boundaries.
/// These replace prose rules with red/green signals that agents respond to.
/// </summary>
public class ArchitectureTests
{
    private static readonly string SrcRoot = FindSrcRoot();
    private static readonly string WebRoot = Path.Combine(SrcRoot, "src", "BibleTimeline.Web");
    private static readonly string JsRoot = Path.Combine(WebRoot, "wwwroot", "js");

    // ─── Backend Layer Rules ──────────────────────────────────────────

    [Fact]
    public void Models_MustNotImport_DataLayer()
    {
        var violations = ScanCSharpImports(
            directory: Path.Combine(WebRoot, "Models"),
            forbiddenNamespaces: ["BibleTimeline.Web.Data", "BibleTimeline.Web.Endpoints", "BibleTimeline.Web.Services"]);

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: Models/ must be pure POCOs with no dependencies on other layers.

            Found {violations.Count} violation(s):
            {FormatViolations(violations)}

            HOW TO FIX:
            - Models/ files should only contain record/class definitions
            - Remove all 'using BibleTimeline.Web.Data/Endpoints/Services' statements
            - If a model needs logic, put it in Services/ instead
            """);
    }

    [Fact]
    public void DataLayer_MustNotImport_Endpoints()
    {
        var violations = ScanCSharpImports(
            directory: Path.Combine(WebRoot, "Data"),
            forbiddenNamespaces: ["BibleTimeline.Web.Endpoints", "BibleTimeline.Web.Services"]);

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: Data/ must not depend on Endpoints/ or Services/.

            Found {violations.Count} violation(s):
            {FormatViolations(violations)}

            HOW TO FIX:
            - Data/ should only import Models/ and external packages (Dapper, Microsoft.Data.Sqlite)
            - Move any endpoint/service logic out of Data/ files
            - Data/ provides data access; it does not orchestrate or handle HTTP
            """);
    }

    [Fact]
    public void Endpoints_MustNotImport_SqliteDirectly()
    {
        var violations = ScanCSharpImports(
            directory: Path.Combine(WebRoot, "Endpoints"),
            forbiddenNamespaces: ["Microsoft.Data.Sqlite", "Dapper"]);

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: Endpoints/ must not use SQLite or Dapper directly.

            Found {violations.Count} violation(s):
            {FormatViolations(violations)}

            HOW TO FIX:
            - Endpoints should depend on Data/BibleTimelineDb (the data access layer)
            - Never write SQL or create SqliteConnection in endpoint files
            - Inject BibleTimelineDb and call its methods instead
            """);
    }

    [Fact]
    public void Services_MustNotImport_Endpoints()
    {
        var servicesDir = Path.Combine(WebRoot, "Services");
        if (!Directory.Exists(servicesDir) || Directory.GetFiles(servicesDir, "*.cs").Length == 0)
            return; // Services/ is empty — skip

        var violations = ScanCSharpImports(
            directory: servicesDir,
            forbiddenNamespaces: ["BibleTimeline.Web.Endpoints"]);

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: Services/ must not depend on Endpoints/.

            Found {violations.Count} violation(s):
            {FormatViolations(violations)}

            HOW TO FIX:
            - Services/ provides business logic to Endpoints/, not the reverse
            - Remove all 'using BibleTimeline.Web.Endpoints' statements
            """);
    }

    [Fact]
    public void NoDirectSqlInEndpoints()
    {
        var endpointsDir = Path.Combine(WebRoot, "Endpoints");
        if (!Directory.Exists(endpointsDir)) return;

        var sqlPatterns = new[] { "SELECT ", "INSERT ", "UPDATE ", "DELETE ", "CREATE TABLE", "DROP TABLE" };
        var violations = new List<string>();

        foreach (var file in Directory.GetFiles(endpointsDir, "*.cs"))
        {
            var content = File.ReadAllText(file);
            foreach (var pattern in sqlPatterns)
            {
                if (content.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                {
                    violations.Add($"  {Path.GetFileName(file)}: contains raw SQL pattern '{pattern}'");
                }
            }
        }

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: Endpoints/ must not contain raw SQL statements.

            Found {violations.Count} violation(s):
            {string.Join("\n", violations)}

            HOW TO FIX:
            - Move all SQL queries to Data/BibleTimelineDb.cs
            - Endpoints should call BibleTimelineDb methods, not write SQL
            """);
    }

    // ─── Frontend Layer Rules ─────────────────────────────────────────

    [Fact]
    public void OnlyApiJs_MayUseFetch()
    {
        if (!Directory.Exists(JsRoot)) return;

        var fetchRegex = new Regex(@"\bfetch\s*\(", RegexOptions.None);
        var violations = new List<string>();

        foreach (var file in Directory.GetFiles(JsRoot, "*.js"))
        {
            var fileName = Path.GetFileName(file);
            if (fileName == "api.js") continue; // api.js is the allowed fetch wrapper

            var lines = File.ReadAllLines(file);
            for (int i = 0; i < lines.Length; i++)
            {
                if (fetchRegex.IsMatch(lines[i]))
                {
                    violations.Add($"  {fileName}:{i + 1} — {lines[i].Trim()}");
                }
            }
        }

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: Only api.js may use fetch(). All other JS files must go through the Api module.

            Found {violations.Count} violation(s):
            {string.Join("\n", violations)}

            HOW TO FIX:
            - Add a new method to api.js (e.g., Api.myNewMethod())
            - Call Api.myNewMethod() from your JS file instead of fetch() directly
            - This ensures all API calls go through a single point for error handling and URL construction
            """);
    }

    [Fact]
    public void NoConsoleLog_InProductionJs()
    {
        if (!Directory.Exists(JsRoot)) return;

        var consoleRegex = new Regex(@"\bconsole\.(log|debug|info|warn|error)\s*\(", RegexOptions.None);
        var violations = new List<string>();

        foreach (var file in Directory.GetFiles(JsRoot, "*.js"))
        {
            var lines = File.ReadAllLines(file);
            for (int i = 0; i < lines.Length; i++)
            {
                if (consoleRegex.IsMatch(lines[i]))
                {
                    violations.Add($"  {Path.GetFileName(file)}:{i + 1} — {lines[i].Trim()}");
                }
            }
        }

        // Allow console.error in app.js for fatal startup errors
        violations = violations.Where(v => !v.Contains("console.error") || !v.Contains("app.js")).ToList();

        Assert.True(violations.Count == 0,
            $"""
            CODE QUALITY: console.log/debug/info/warn found in production JS files.

            Found {violations.Count} instance(s):
            {string.Join("\n", violations)}

            HOW TO FIX:
            - Remove console.log() statements before committing
            - For error reporting, use a proper error handler instead
            - If debugging, use the browser DevTools breakpoints instead of console.log
            """);
    }

    [Fact]
    public void NoDebugger_InJs()
    {
        if (!Directory.Exists(JsRoot)) return;

        var debuggerRegex = new Regex(@"^\s*debugger\s*;?\s*$", RegexOptions.None);
        var violations = new List<string>();

        foreach (var file in Directory.GetFiles(JsRoot, "*.js"))
        {
            var lines = File.ReadAllLines(file);
            for (int i = 0; i < lines.Length; i++)
            {
                if (debuggerRegex.IsMatch(lines[i]))
                {
                    violations.Add($"  {Path.GetFileName(file)}:{i + 1}");
                }
            }
        }

        Assert.True(violations.Count == 0,
            $"""
            CODE QUALITY: 'debugger' statement found in JS files.

            Found {violations.Count} instance(s):
            {string.Join("\n", violations)}

            HOW TO FIX:
            - Remove all 'debugger;' statements before committing
            """);
    }

    [Fact]
    public void NoHardcodedApiUrls_InNonApiJs()
    {
        if (!Directory.Exists(JsRoot)) return;

        var urlRegex = new Regex(@"['""]\/api\/", RegexOptions.None);
        var violations = new List<string>();

        foreach (var file in Directory.GetFiles(JsRoot, "*.js"))
        {
            var fileName = Path.GetFileName(file);
            if (fileName == "api.js") continue; // api.js is allowed to have API URLs

            var lines = File.ReadAllLines(file);
            for (int i = 0; i < lines.Length; i++)
            {
                if (urlRegex.IsMatch(lines[i]))
                {
                    violations.Add($"  {fileName}:{i + 1} — {lines[i].Trim()}");
                }
            }
        }

        Assert.True(violations.Count == 0,
            $"""
            ARCHITECTURE VIOLATION: API URLs found outside of api.js.

            Found {violations.Count} violation(s):
            {string.Join("\n", violations)}

            HOW TO FIX:
            - All API URLs must be defined in api.js only
            - Add a method to the Api object in api.js
            - Call that method from your file instead of hardcoding the URL
            """);
    }

    // ─── Schema & Config Integrity ────────────────────────────────────

    [Fact]
    public void SchemaSql_IsValidSql()
    {
        var schemaPath = Path.Combine(WebRoot, "Data", "Schema.sql");
        Assert.True(File.Exists(schemaPath),
            "Schema.sql not found at Data/Schema.sql");

        var content = File.ReadAllText(schemaPath);
        Assert.True(content.Contains("CREATE TABLE"), "Schema.sql must contain CREATE TABLE statements");
        Assert.True(content.Contains("CREATE INDEX") || content.Contains("CREATE VIRTUAL TABLE"),
            "Schema.sql should contain indexes or FTS tables for performance");
    }

    [Fact]
    public void SeedDataSql_IsValidSql()
    {
        var seedPath = Path.Combine(WebRoot, "Data", "SeedData.sql");
        Assert.True(File.Exists(seedPath),
            "SeedData.sql not found at Data/SeedData.sql");

        var content = File.ReadAllText(seedPath);
        Assert.True(content.Contains("INSERT INTO"), "SeedData.sql must contain INSERT statements");
    }

    [Fact]
    public void EmbeddedResources_AreConfigured()
    {
        var csproj = File.ReadAllText(Path.Combine(WebRoot, "BibleTimeline.Web.csproj"));
        Assert.Contains("EmbeddedResource", csproj);
        Assert.Contains("Schema.sql", csproj);
        Assert.Contains("SeedData.sql", csproj);
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private static List<string> ScanCSharpImports(string directory, string[] forbiddenNamespaces)
    {
        var violations = new List<string>();
        if (!Directory.Exists(directory)) return violations;

        foreach (var file in Directory.GetFiles(directory, "*.cs"))
        {
            var lines = File.ReadAllLines(file);
            for (int i = 0; i < lines.Length; i++)
            {
                var line = lines[i].Trim();
                if (!line.StartsWith("using ")) continue;

                foreach (var ns in forbiddenNamespaces)
                {
                    if (line.Contains(ns))
                    {
                        violations.Add($"  {Path.GetFileName(file)}:{i + 1} — '{line}' (forbidden: {ns})");
                    }
                }
            }
        }

        return violations;
    }

    private static string FormatViolations(List<string> violations)
    {
        return violations.Count > 0 ? string.Join("\n", violations) : "(none)";
    }

    private static string FindSrcRoot()
    {
        // Walk up from test assembly location to find the repo root (contains BibleTimeline.sln)
        var dir = AppContext.BaseDirectory;
        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir, "BibleTimeline.sln")))
                return dir;
            dir = Path.GetDirectoryName(dir);
        }

        // Fallback: relative path from test output
        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));
    }
}

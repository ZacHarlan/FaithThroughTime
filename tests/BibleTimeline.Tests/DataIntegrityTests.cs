using System.Text.Json;
using BibleTimeline.Web.Data;
using Microsoft.Data.Sqlite;

namespace BibleTimeline.Tests;

/// <summary>
/// Integrity checks against the real seed (Schema.sql + SeedData.sql), loaded into a throwaway
/// SQLite file. These guard the data audit: if someone edits SeedData.sql and breaks a rule,
/// the failure names the rows.
/// </summary>
public sealed class DataIntegrityTests : IDisposable
{
    private static readonly string[] Roles =
    [
        "patriarch", "matriarch", "ancestor", "prophet", "king", "queen", "ruler", "judge", "priest",
        "apostle", "disciple", "warrior", "sage", "church-leader", "reformer", "messiah", "other"
    ];

    private static readonly string[] Categories =
    [
        "creation", "covenant", "law", "judgment", "miracle", "salvation", "war", "conquest", "kingdom",
        "worship", "prophecy", "exile", "birth", "death", "teaching", "mission", "council", "scripture",
        "persecution", "reform", "other"
    ];

    // Documented textual exceptions to the 12-year rule, as (child, parent), allowed by name.
    // With the current seed only Hezekiah/Ahaz (11 years, 2 Kings 16:2 and 18:2) actually needs it;
    // the Boaz pairs (Matt 1:5, an abbreviated genealogy) are 240+ years apart and pass anyway.
    private static readonly (string Child, string Parent)[] ParentAgeExceptions =
    [
        ("Hezekiah", "Ahaz"),
        ("Boaz", "Salmon"),
        ("Boaz", "Rahab"),
    ];

    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"ftt-integrity-{Guid.NewGuid():N}.db");
    private readonly SqliteConnection _conn;

    public DataIntegrityTests()
    {
        var connStr = $"Data Source={_dbPath}";
        new DatabaseInitializer(connStr).Initialize();
        _conn = new SqliteConnection(connStr);
        _conn.Open();
    }

    public void Dispose()
    {
        _conn.Dispose();
        SqliteConnection.ClearAllPools();
        foreach (var f in Directory.GetFiles(Path.GetTempPath(), Path.GetFileName(_dbPath) + "*"))
        {
            try { File.Delete(f); } catch (IOException) { /* best effort */ }
        }
    }

    // ── helpers ──────────────────────────────────────────────────────

    private List<object?[]> Query(string sql)
    {
        using var cmd = _conn.CreateCommand();
        cmd.CommandText = sql;
        using var r = cmd.ExecuteReader();
        var rows = new List<object?[]>();
        while (r.Read())
        {
            var row = new object?[r.FieldCount];
            for (int i = 0; i < r.FieldCount; i++) row[i] = r.IsDBNull(i) ? null : r.GetValue(i);
            rows.Add(row);
        }
        return rows;
    }

    private static int? Int(object? o) => o == null ? null : Convert.ToInt32(o);

    // No year 0: BC years are negative, AD positive, so the axis is continuous when -1 maps to 0.
    private static int Axis(int y) => y < 0 ? y + 1 : y;

    private static string Fmt(IEnumerable<string> items) => string.Join("\n  ", items);

    private int PersonId(string name) => Convert.ToInt32(Query($"SELECT id FROM people WHERE name = '{name.Replace("'", "''")}'").Single()[0]);

    private void AssertYear(string eventName, string column, int expected)
    {
        var rows = Query($"SELECT {column} FROM events WHERE name = '{eventName.Replace("'", "''")}'");
        Assert.True(rows.Count == 1, $"Expected exactly one event named '{eventName}', found {rows.Count}.");
        Assert.Equal(expected, Int(rows[0][0]));
    }

    // ── vocabularies ─────────────────────────────────────────────────

    [Fact]
    public void PeopleRoles_AreInVocabulary()
    {
        var bad = Query("SELECT id, name, role FROM people")
            .Where(r => r[2] is not string s || !Roles.Contains(s))
            .Select(r => $"{r[0]} {r[1]}: role={r[2] ?? "NULL"}").ToList();
        Assert.True(bad.Count == 0, $"people.role outside the vocabulary:\n  {Fmt(bad)}");
    }

    [Fact]
    public void EventCategories_AreInVocabulary()
    {
        var bad = Query("SELECT id, name, category FROM events")
            .Where(r => r[2] is not string s || !Categories.Contains(s))
            .Select(r => $"{r[0]} {r[1]}: category={r[2] ?? "NULL"}").ToList();
        Assert.True(bad.Count == 0, $"events.category outside the vocabulary:\n  {Fmt(bad)}");
    }

    // ── years ────────────────────────────────────────────────────────

    [Fact]
    public void NoYearZero_Anywhere()
    {
        var checks = new[]
        {
            "SELECT 'people', id, name FROM people WHERE birth_year = 0 OR death_year = 0",
            "SELECT 'events', id, name FROM events WHERE start_year = 0 OR end_year = 0",
            "SELECT 'time_periods', id, name FROM time_periods WHERE start_year = 0 OR end_year = 0",
            "SELECT 'biblical_books', id, name FROM biblical_books WHERE approx_writing_year = 0 OR period_covered_start = 0 OR period_covered_end = 0",
            "SELECT 'journey_stops', id, label FROM journey_stops WHERE year = 0",
        };
        var bad = checks.SelectMany(Query).Select(r => $"{r[0]} {r[1]} {r[2]}").ToList();
        Assert.True(bad.Count == 0, $"There is no year 0 (1 BC is -1, AD 1 is 1). Rows with year = 0:\n  {Fmt(bad)}");
    }

    [Fact]
    public void NoPersonDiesBeforeBirth()
    {
        var bad = Query("SELECT id, name, birth_year, death_year FROM people WHERE birth_year IS NOT NULL AND death_year IS NOT NULL")
            .Where(r => Axis(Int(r[3])!.Value) < Axis(Int(r[2])!.Value))
            .Select(r => $"{r[0]} {r[1]}: born {r[2]}, died {r[3]}").ToList();
        Assert.True(bad.Count == 0, $"People who die before they are born:\n  {Fmt(bad)}");
    }

    [Fact]
    public void NoEventEndsBeforeStart()
    {
        var bad = Query("SELECT id, name, start_year, end_year FROM events WHERE start_year IS NOT NULL AND end_year IS NOT NULL")
            .Where(r => Axis(Int(r[3])!.Value) < Axis(Int(r[2])!.Value))
            .Select(r => $"{r[0]} {r[1]}: start {r[2]}, end {r[3]}").ToList();
        Assert.True(bad.Count == 0, $"Events that end before they start:\n  {Fmt(bad)}");
    }

    [Fact]
    public void Parents_AreBornAtLeastTwelveYearsBeforeChild()
    {
        var names = Query("SELECT id, name FROM people").ToDictionary(r => Convert.ToInt32(r[0]), r => (string)r[1]!);
        var rows = Query("""
            SELECT c.id, c.name, c.birth_year, p.name, p.birth_year, k.kind
            FROM people c
            JOIN (SELECT id, father_id AS pid, 'father' AS kind FROM people WHERE father_id IS NOT NULL
                  UNION ALL
                  SELECT id, mother_id, 'mother' FROM people WHERE mother_id IS NOT NULL) k ON k.id = c.id
            JOIN people p ON p.id = k.pid
            WHERE c.birth_year IS NOT NULL AND p.birth_year IS NOT NULL
            """);
        var bad = new List<string>();
        foreach (var r in rows)
        {
            var child = (string)r[1]!; var parent = (string)r[3]!;
            var gap = Axis(Int(r[2])!.Value) - Axis(Int(r[4])!.Value);
            if (gap >= 12) continue;
            if (ParentAgeExceptions.Contains((child, parent))) continue;
            bad.Add($"{child} (b. {r[2]}) and {r[5]} {parent} (b. {r[4]}): gap {gap} years");
        }
        Assert.True(bad.Count == 0, $"Parent born fewer than 12 years before child:\n  {Fmt(bad)}");
    }

    // ── structure ────────────────────────────────────────────────────

    [Fact]
    public void FatherChain_FromJesus_ReachesAdam_WithoutCycle()
    {
        var father = Query("SELECT id, father_id FROM people")
            .ToDictionary(r => Convert.ToInt32(r[0]), r => Int(r[1]));
        var names = Query("SELECT id, name FROM people").ToDictionary(r => Convert.ToInt32(r[0]), r => (string)r[1]!);

        var id = PersonId("Jesus");
        var seen = new HashSet<int>();
        var last = id;
        while (true)
        {
            Assert.True(seen.Add(id), $"Cycle in father_id chain at {names[id]} ({id})");
            last = id;
            if (father[id] is not int next) break;
            id = next;
        }
        Assert.Equal("Adam", names[last]);
        Assert.True(seen.Count > 40, $"Chain from Jesus to Adam is suspiciously short ({seen.Count} people)");
    }

    [Fact]
    public void NoParentCycles_AnywhereInTheTree()
    {
        var rows = Query("SELECT id, father_id, mother_id FROM people");
        var parents = rows.ToDictionary(r => Convert.ToInt32(r[0]),
            r => new[] { Int(r[1]), Int(r[2]) }.Where(x => x.HasValue).Select(x => x!.Value).ToArray());
        var state = new Dictionary<int, int>(); // 1 = visiting, 2 = done
        var cycles = new List<int>();
        bool Visit(int n)
        {
            if (state.TryGetValue(n, out var s)) return s == 1;
            state[n] = 1;
            foreach (var p in parents.GetValueOrDefault(n, [])) if (Visit(p)) { cycles.Add(n); }
            state[n] = 2;
            return false;
        }
        foreach (var n in parents.Keys) Visit(n);
        Assert.True(cycles.Count == 0, $"Parent cycle through person ids: {string.Join(", ", cycles.Distinct())}");
    }

    [Fact]
    public void TimePeriods_AreContiguous()
    {
        var rows = Query("SELECT name, start_year, end_year FROM time_periods ORDER BY sort_order, start_year");
        Assert.NotEmpty(rows);
        var bad = new List<string>();
        for (int i = 0; i < rows.Count; i++)
        {
            var (s, e) = (Int(rows[i][1])!.Value, Int(rows[i][2])!.Value);
            if (Axis(e) <= Axis(s)) bad.Add($"{rows[i][0]}: ends ({e}) at or before it starts ({s})");
            if (i > 0 && Int(rows[i - 1][2]) != s)
                bad.Add($"{rows[i - 1][0]} ends {rows[i - 1][2]} but {rows[i][0]} starts {s}");
        }
        Assert.True(bad.Count == 0, $"Time periods are not contiguous:\n  {Fmt(bad)}");
    }

    [Fact]
    public void NoDuplicatePersonNames()
    {
        var dupes = Query("SELECT name, COUNT(*) FROM people GROUP BY name HAVING COUNT(*) > 1")
            .Select(r => $"{r[0]} x{r[1]}").ToList();
        Assert.True(dupes.Count == 0, $"Duplicate person names (disambiguate, e.g. 'James, son of Zebedee'):\n  {Fmt(dupes)}");
    }

    [Fact]
    public void NoDuplicateEventNames()
    {
        var dupes = Query("SELECT name, COUNT(*) FROM events GROUP BY name HAVING COUNT(*) > 1")
            .Select(r => $"{r[0]} x{r[1]}").ToList();
        Assert.True(dupes.Count == 0, $"Duplicate event names:\n  {Fmt(dupes)}");
    }

    [Fact]
    public void BrothersOfJesus_HaveNoParents_ButAreSiblingsOfJesus()
    {
        // Deliberate: traditions read Mark 6:3 differently, so parentage is left unstated.
        var jesus = PersonId("Jesus");
        foreach (var name in new[] { "James, brother of Jesus", "Joses, brother of Jesus", "Simon, brother of Jesus", "Jude, brother of Jesus" })
        {
            var id = PersonId(name);
            var parents = Query($"SELECT father_id, mother_id FROM people WHERE id = {id}").Single();
            Assert.True(parents[0] == null && parents[1] == null, $"{name} must not have father_id/mother_id");
            var link = Query($"""
                SELECT COUNT(*) FROM person_relationships
                WHERE relationship_type = 'sibling'
                  AND ((person_id_1 = {jesus} AND person_id_2 = {id}) OR (person_id_1 = {id} AND person_id_2 = {jesus}))
                """);
            Assert.Equal(1, Convert.ToInt32(link[0][0]));
        }
    }

    // ── scripture references against the local KJV ───────────────────

    [Fact]
    public void ScriptureReferences_ExistInLocalKjv()
    {
        var kjvDir = Path.Combine(FindRepoRoot(), "src", "BibleTimeline.Web", "wwwroot", "bibles", "kjv");
        Assert.True(Directory.Exists(kjvDir), $"KJV directory missing: {kjvDir}");

        var cache = new Dictionary<string, Dictionary<int, HashSet<int>>>();
        Dictionary<int, HashSet<int>> Load(string bookName)
        {
            var slug = bookName.ToLowerInvariant().Replace(' ', '-');
            if (cache.TryGetValue(slug, out var c)) return c;
            var path = Path.Combine(kjvDir, slug + ".json");
            Assert.True(File.Exists(path), $"No KJV file for book '{bookName}' ({slug}.json)");
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            var map = new Dictionary<int, HashSet<int>>();
            foreach (var ch in doc.RootElement.EnumerateObject())
                map[int.Parse(ch.Name)] = ch.Value.EnumerateObject().Select(v => int.Parse(v.Name)).ToHashSet();
            return cache[slug] = map;
        }

        var rows = Query("""
            SELECT r.id, r.reference_text, b.name, r.chapter_start, r.verse_start, r.chapter_end, r.verse_end
            FROM scripture_references r LEFT JOIN biblical_books b ON b.id = r.book_id
            """);
        Assert.NotEmpty(rows);

        var bad = new List<string>();
        foreach (var r in rows)
        {
            var label = $"#{r[0]} {r[1]}";
            if (r[2] is not string book) { bad.Add($"{label}: no book"); continue; }
            if (r[3] == null || r[4] == null || r[5] == null || r[6] == null) { bad.Add($"{label}: missing chapter/verse column"); continue; }
            var (c1, v1, c2, v2) = (Int(r[3])!.Value, Int(r[4])!.Value, Int(r[5])!.Value, Int(r[6])!.Value);
            var kjv = Load(book);

            if (!r[1]!.ToString()!.StartsWith(book + " ")) bad.Add($"{label}: reference_text does not start with book '{book}'");
            if (c2 < c1 || (c2 == c1 && v2 < v1)) { bad.Add($"{label}: range ends before it starts"); continue; }
            if (!kjv.TryGetValue(c1, out var startVerses) || !startVerses.Contains(v1)) { bad.Add($"{label}: {book} {c1}:{v1} not in KJV"); continue; }
            if (!kjv.TryGetValue(c2, out var endVerses) || !endVerses.Contains(v2)) { bad.Add($"{label}: {book} {c2}:{v2} not in KJV"); continue; }
            for (int c = c1; c <= c2; c++)
                if (!kjv.ContainsKey(c)) bad.Add($"{label}: chapter {c} not in KJV");
        }
        Assert.True(bad.Count == 0, $"Scripture references that do not resolve in the local KJV ({bad.Count}):\n  {Fmt(bad)}");
    }

    // ── Ussher anchors ───────────────────────────────────────────────

    [Fact]
    public void UssherAnchors_Hold()
    {
        AssertYear("Creation", "start_year", -4004);
        AssertYear("The Flood", "start_year", -2349);
        AssertYear("The Exodus", "start_year", -1491);
        AssertYear("Kingdom Divides", "start_year", -975);
        AssertYear("Fall of Jerusalem", "start_year", -588);

        var abraham = Query("SELECT birth_year FROM people WHERE name = 'Abraham'").Single();
        Assert.Equal(-1996, Int(abraham[0]));
    }

    private static string FindRepoRoot()
    {
        var dir = AppContext.BaseDirectory;
        while (dir != null && !File.Exists(Path.Combine(dir, "BibleTimeline.sln"))) dir = Path.GetDirectoryName(dir);
        return dir ?? throw new DirectoryNotFoundException("BibleTimeline.sln not found above the test assembly");
    }
}

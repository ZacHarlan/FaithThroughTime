using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace BibleTimeline.Tests;

public class DatasetTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly Regex UrlSafe = new("^[a-z0-9]+(-[a-z0-9]+)*$");

    public DatasetTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    private async Task<JsonElement> GetDataset(string url = "/api/dataset")
    {
        var response = await _client.GetAsync(url);
        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.Clone();
    }

    private static IEnumerable<JsonElement> Arr(JsonElement d, string name) => d.GetProperty(name).EnumerateArray();
    private static HashSet<int> Ids(JsonElement d, string name) => Arr(d, name).Select(e => e.GetProperty("id").GetInt32()).ToHashSet();

    [Fact]
    public async Task Dataset_HasExpectedShape()
    {
        var d = await GetDataset();
        foreach (var k in new[] { "meta", "periods", "people", "events", "relationships", "locations", "books", "journeys" })
            Assert.True(d.TryGetProperty(k, out _), k);

        var meta = d.GetProperty("meta");
        Assert.Equal(2, meta.GetProperty("version").GetInt32());
        Assert.Equal("ussher", meta.GetProperty("chronology").GetString());
        Assert.True(DateTime.TryParse(meta.GetProperty("generatedAt").GetString(), out _));

        var person = Arr(d, "people").First();
        foreach (var k in new[] { "id", "slug", "name", "altNames", "birthYear", "deathYear", "birthApprox", "deathApprox",
            "dateConfidence", "role", "significance", "tribe", "fatherId", "motherId", "description", "dateNotes", "events", "scripture" })
            Assert.True(person.TryGetProperty(k, out _), "person." + k);
        Assert.Equal(JsonValueKind.Array, person.GetProperty("altNames").ValueKind);

        var evt = Arr(d, "events").First();
        foreach (var k in new[] { "id", "slug", "name", "startYear", "endYear", "startApprox", "endApprox", "dateConfidence",
            "category", "significance", "description", "dateNotes", "sortOrder", "people", "locationIds", "scripture" })
            Assert.True(evt.TryGetProperty(k, out _), "event." + k);

        foreach (var k in new[] { "id", "slug", "name", "startYear", "endYear", "color", "sortOrder", "description" })
            Assert.True(Arr(d, "periods").First().TryGetProperty(k, out _), "period." + k);
        foreach (var k in new[] { "id", "slug", "name", "modernName", "lat", "lng", "region", "description" })
            Assert.True(Arr(d, "locations").First().TryGetProperty(k, out _), "location." + k);
        foreach (var k in new[] { "id", "slug", "name", "abbreviation", "testament", "genre", "writingYear", "coversStart", "coversEnd" })
            Assert.True(Arr(d, "books").First().TryGetProperty(k, out _), "book." + k);
        foreach (var k in new[] { "a", "b", "type" })
            Assert.True(Arr(d, "relationships").First().TryGetProperty(k, out _), "relationship." + k);
        foreach (var k in new[] { "id", "slug", "name", "description", "bookId", "personIds", "stops" })
            Assert.True(Arr(d, "journeys").First().TryGetProperty(k, out _), "journey." + k);
    }

    [Fact]
    public async Task Dataset_ArraysAreNeverNull()
    {
        var d = await GetDataset();
        foreach (var p in Arr(d, "people"))
            foreach (var k in new[] { "altNames", "events", "scripture" })
                Assert.Equal(JsonValueKind.Array, p.GetProperty(k).ValueKind);
        foreach (var e in Arr(d, "events"))
            foreach (var k in new[] { "people", "locationIds", "scripture" })
                Assert.Equal(JsonValueKind.Array, e.GetProperty(k).ValueKind);
        foreach (var j in Arr(d, "journeys"))
            foreach (var k in new[] { "personIds", "stops" })
                Assert.Equal(JsonValueKind.Array, j.GetProperty(k).ValueKind);
    }

    [Fact]
    public async Task Dataset_CountsMatchArrays()
    {
        var d = await GetDataset();
        var counts = d.GetProperty("meta").GetProperty("counts");
        Assert.Equal(d.GetProperty("people").GetArrayLength(), counts.GetProperty("people").GetInt32());
        Assert.Equal(d.GetProperty("events").GetArrayLength(), counts.GetProperty("events").GetInt32());
        Assert.Equal(d.GetProperty("locations").GetArrayLength(), counts.GetProperty("locations").GetInt32());

        // and match the tables, via the existing endpoints
        var timeline = await _client.GetFromJsonAsyncCompat("/api/timeline");
        Assert.Equal(timeline.Count(i => i.GetProperty("type").GetString() == "person"), counts.GetProperty("people").GetInt32());
        Assert.Equal(timeline.Count(i => i.GetProperty("type").GetString() == "event"), counts.GetProperty("events").GetInt32());
        var books = await _client.GetFromJsonAsyncCompat("/api/timeline/books");
        Assert.Equal(books.Count, d.GetProperty("books").GetArrayLength());
        var periods = await _client.GetFromJsonAsyncCompat("/api/timeline/periods");
        Assert.Equal(periods.Count, d.GetProperty("periods").GetArrayLength());
    }

    [Theory]
    [InlineData("people")]
    [InlineData("events")]
    [InlineData("locations")]
    [InlineData("periods")]
    [InlineData("journeys")]
    [InlineData("books")]
    public async Task Dataset_SlugsAreNonEmptyUrlSafeAndUnique(string table)
    {
        var d = await GetDataset();
        var slugs = Arr(d, table).Select(e => e.GetProperty("slug").GetString()!).ToList();
        Assert.NotEmpty(slugs);
        Assert.All(slugs, s => Assert.Matches(UrlSafe, s));
        Assert.Equal(slugs.Count, slugs.Distinct().Count());
    }

    [Fact]
    public async Task Dataset_CollidingSlugsGetNumericSuffixesInSignificanceOrder()
    {
        var d = await GetDataset();
        foreach (var table in new[] { "people", "events" })
        {
            var rows = Arr(d, table).ToList();
            var groups = rows.GroupBy(r => Slugify(r.GetProperty("name").GetString()!)).Where(g => g.Count() > 1);
            foreach (var g in groups)
            {
                var ordered = g.OrderBy(r => r.GetProperty("significance").GetString() switch { "major" => 0, "moderate" => 1, _ => 2 })
                    .ThenBy(r => r.GetProperty("id").GetInt32()).ToList();
                for (var i = 0; i < ordered.Count; i++)
                    Assert.Equal(i == 0 ? g.Key : $"{g.Key}-{i + 1}", ordered[i].GetProperty("slug").GetString());
            }
        }
    }

    private static string Slugify(string s) => BibleTimeline.Web.Data.Slugger.Slugify(s);

    [Fact]
    public async Task Dataset_ReferencesResolve()
    {
        var d = await GetDataset();
        var people = Ids(d, "people");
        var events = Ids(d, "events");
        var locations = Ids(d, "locations");
        var books = Ids(d, "books");

        foreach (var p in Arr(d, "people"))
        {
            foreach (var k in new[] { "fatherId", "motherId" })
            {
                var v = p.GetProperty(k);
                if (v.ValueKind != JsonValueKind.Null) Assert.Contains(v.GetInt32(), people);
            }
            foreach (var pe in p.GetProperty("events").EnumerateArray())
                Assert.Contains(pe.GetProperty("id").GetInt32(), events);
        }
        foreach (var e in Arr(d, "events"))
        {
            foreach (var pe in e.GetProperty("people").EnumerateArray())
                Assert.Contains(pe.GetProperty("id").GetInt32(), people);
            foreach (var l in e.GetProperty("locationIds").EnumerateArray())
                Assert.Contains(l.GetInt32(), locations);
        }
        foreach (var r in Arr(d, "relationships"))
        {
            Assert.Contains(r.GetProperty("a").GetInt32(), people);
            Assert.Contains(r.GetProperty("b").GetInt32(), people);
        }
        foreach (var j in Arr(d, "journeys"))
        {
            var b = j.GetProperty("bookId");
            if (b.ValueKind != JsonValueKind.Null) Assert.Contains(b.GetInt32(), books);
            foreach (var pid in j.GetProperty("personIds").EnumerateArray())
                Assert.Contains(pid.GetInt32(), people);
            foreach (var s in j.GetProperty("stops").EnumerateArray())
            {
                Assert.Contains(s.GetProperty("locationId").GetInt32(), locations);
                var ev = s.GetProperty("eventId");
                if (ev.ValueKind != JsonValueKind.Null) Assert.Contains(ev.GetInt32(), events);
            }
        }
    }

    [Fact]
    public async Task Dataset_PeopleAndEventsOrderedByStartYearNullsLast()
    {
        var d = await GetDataset();
        AssertOrdered(Arr(d, "people").Select(p => (p.GetProperty("birthYear"), p.GetProperty("id").GetInt32())));
        AssertOrdered(Arr(d, "events").Select(e => (e.GetProperty("startYear"), e.GetProperty("id").GetInt32())));
    }

    private static void AssertOrdered(IEnumerable<(JsonElement Year, int Id)> rows)
    {
        var keys = rows.Select(r => (r.Year.ValueKind == JsonValueKind.Null ? int.MaxValue : r.Year.GetInt32(), r.Id)).ToList();
        Assert.Equal(keys.OrderBy(k => k.Item1).ThenBy(k => k.Id).ToList(), keys);
    }

    [Fact]
    public async Task Dataset_BothRoutesReturnSamePayload()
    {
        var a = await GetDataset("/api/dataset");
        var b = await GetDataset("/data/dataset.json");
        Assert.Equal(a.ToString(), b.ToString());
    }

    [Fact]
    public async Task Dataset_HasCacheHeaders()
    {
        var response = await _client.GetAsync("/data/dataset.json");
        Assert.NotNull(response.Headers.CacheControl);
        Assert.True(response.Headers.CacheControl!.MaxAge > TimeSpan.Zero);
    }

    [Fact]
    public async Task Dataset_BookSlugsMatchKjvFiles()
    {
        var d = await GetDataset();
        var dir = FindKjvDir();
        var files = Directory.GetFiles(dir, "*.json").Select(f => Path.GetFileNameWithoutExtension(f)).ToHashSet();
        foreach (var b in Arr(d, "books"))
            Assert.Contains(b.GetProperty("slug").GetString()!, files);
    }

    private static string FindKjvDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "src", "BibleTimeline.Web", "wwwroot", "bibles", "kjv");
            if (Directory.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("wwwroot/bibles/kjv not found");
    }
}

internal static class HttpClientJsonExtensions
{
    public static async Task<List<JsonElement>> GetFromJsonAsyncCompat(this HttpClient client, string url)
    {
        var text = await client.GetStringAsync(url);
        using var doc = JsonDocument.Parse(text);
        return doc.RootElement.EnumerateArray().Select(e => e.Clone()).ToList();
    }
}

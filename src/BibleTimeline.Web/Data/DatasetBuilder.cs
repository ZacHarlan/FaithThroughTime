using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.Data.Sqlite;
using BibleTimeline.Web.Models;

namespace BibleTimeline.Web.Data;

/// <summary>Serializer settings shared by the /api/dataset endpoint and the --export-dataset mode.</summary>
public static class DatasetJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        WriteIndented = false
    };

    public static byte[] Serialize(DatasetDto dataset) => JsonSerializer.SerializeToUtf8Bytes(dataset, Options);
}

public static class Slugger
{
    private static readonly Regex NonAlnum = new("[^a-z0-9]+", RegexOptions.Compiled);

    public static string Slugify(string? text)
    {
        if (string.IsNullOrEmpty(text)) return "";
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        var lower = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        return NonAlnum.Replace(lower, "-").Trim('-');
    }

    /// <summary>
    /// Assigns unique slugs. Rows are ranked by (rank, id); the first of each colliding group keeps the
    /// bare slug, later ones get -2, -3, ...
    /// </summary>
    public static Dictionary<int, string> Assign(IEnumerable<(int Id, string? Name, int Rank)> rows, string fallback)
    {
        var result = new Dictionary<int, string>();
        var used = new HashSet<string>();
        var counters = new Dictionary<string, int>();
        foreach (var row in rows.OrderBy(r => r.Rank).ThenBy(r => r.Id))
        {
            var bare = Slugify(row.Name);
            if (bare.Length == 0) bare = fallback;
            var slug = bare;
            if (!counters.TryGetValue(bare, out var n)) n = 1;
            while (!used.Add(slug))
            {
                n++;
                slug = $"{bare}-{n}";
            }
            counters[bare] = n;
            result[row.Id] = slug;
        }
        return result;
    }

    public static int SignificanceRank(string? s) => s switch { "major" => 0, "moderate" => 1, _ => 2 };
}

public partial class BibleTimelineDb
{
    // Book names that differ from the file names under wwwroot/bibles/kjv/.
    private static readonly Dictionary<string, string> BookSlugAliases = new()
    {
        ["psalm"] = "psalms",
        ["song-of-songs"] = "song-of-solomon",
        ["canticles"] = "song-of-solomon",
        ["songs-of-solomon"] = "song-of-solomon",
        ["revelation-of-john"] = "revelation",
        ["the-revelation"] = "revelation",
    };

    private readonly object _datasetLock = new();
    private Task<(DatasetDto Dataset, byte[] Json)>? _datasetCache;

    /// <summary>Builds (once) and returns the cached dataset.</summary>
    public Task<DatasetDto> GetDatasetAsync() => GetCachedDataset().ContinueWith(t => t.Result.Dataset);

    /// <summary>Serialized dataset bytes (cached with the dataset).</summary>
    public Task<byte[]> GetDatasetJsonAsync() => GetCachedDataset().ContinueWith(t => t.Result.Json);

    private Task<(DatasetDto Dataset, byte[] Json)> GetCachedDataset()
    {
        lock (_datasetLock)
        {
            return _datasetCache ??= Task.Run(async () =>
            {
                var ds = await BuildDatasetAsync();
                return (ds, DatasetJson.Serialize(ds));
            });
        }
    }

    private sealed class PersonRow
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? AltNames { get; set; }
        public int? BirthYear { get; set; }
        public int? DeathYear { get; set; }
        public bool BirthApprox { get; set; }
        public bool DeathApprox { get; set; }
        public string DateConfidence { get; set; } = "traditional";
        public string? Role { get; set; }
        public string Significance { get; set; } = "minor";
        public string? Tribe { get; set; }
        public int? FatherId { get; set; }
        public int? MotherId { get; set; }
        public string? Description { get; set; }
        public string? DateNotes { get; set; }
    }

    private sealed class EventRow
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public int? StartYear { get; set; }
        public int? EndYear { get; set; }
        public bool StartApprox { get; set; }
        public bool EndApprox { get; set; }
        public string DateConfidence { get; set; } = "traditional";
        public string? Category { get; set; }
        public string Significance { get; set; } = "minor";
        public string? Description { get; set; }
        public string? DateNotes { get; set; }
        public int SortOrder { get; set; }
    }

    private sealed class PersonEventRow { public int PersonId { get; set; } public int EventId { get; set; } public string? Role { get; set; } }
    private sealed class PersonScriptureRow { public int PersonId { get; set; } public string Ref { get; set; } = ""; public string? Context { get; set; } }
    private sealed class EventScriptureRow { public int EventId { get; set; } public string Ref { get; set; } = ""; }
    private sealed class EventLocationRow { public int EventId { get; set; } public int LocationId { get; set; } }
    private sealed class JourneyPersonRow { public int JourneyId { get; set; } public int PersonId { get; set; } }
    private sealed class StopRow
    {
        public int JourneyId { get; set; }
        public int SortOrder { get; set; }
        public int LocationId { get; set; }
        public int? EventId { get; set; }
        public string Label { get; set; } = "";
        public string? Description { get; set; }
        public int? Year { get; set; }
        public string? Chapter { get; set; }
    }
    private sealed class JourneyRow { public int Id { get; set; } public string Name { get; set; } = ""; public string? Description { get; set; } public int? BookId { get; set; } }
    private sealed class PeriodRow
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public int StartYear { get; set; }
        public int EndYear { get; set; }
        public string? Color { get; set; }
        public int SortOrder { get; set; }
        public string? Description { get; set; }
    }
    private sealed class LocationRow
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? ModernName { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Region { get; set; }
        public string? Description { get; set; }
    }
    private sealed class BookRow
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Abbreviation { get; set; }
        public string? Testament { get; set; }
        public string? Genre { get; set; }
        public int? ApproxWritingYear { get; set; }
        public int? PeriodCoveredStart { get; set; }
        public int? PeriodCoveredEnd { get; set; }
    }
    private sealed class RelRow { public int PersonId1 { get; set; } public int PersonId2 { get; set; } public string RelationshipType { get; set; } = ""; }

    private async Task<DatasetDto> BuildDatasetAsync()
    {
        using var conn = CreateConnection();

        var people = (await conn.QueryAsync<PersonRow>("""
            SELECT id, name, alt_names, birth_year, death_year, birth_approx, death_approx, date_confidence,
                   role, significance, tribe, father_id, mother_id, description, date_notes
            FROM people
            ORDER BY (birth_year IS NULL), birth_year, id
            """)).ToList();

        var events = (await conn.QueryAsync<EventRow>("""
            SELECT id, name, start_year, end_year, start_approx, end_approx, date_confidence, category,
                   significance, description, date_notes, sort_order
            FROM events
            ORDER BY (start_year IS NULL), start_year, id
            """)).ToList();

        var periods = (await conn.QueryAsync<PeriodRow>(
            "SELECT id, name, start_year, end_year, color, sort_order, description FROM time_periods ORDER BY sort_order, id")).ToList();
        var locations = (await conn.QueryAsync<LocationRow>(
            "SELECT id, name, modern_name, latitude, longitude, region, description FROM locations ORDER BY id")).ToList();
        var books = (await conn.QueryAsync<BookRow>(
            "SELECT id, name, abbreviation, testament, genre, approx_writing_year, period_covered_start, period_covered_end FROM biblical_books ORDER BY id")).ToList();
        var journeys = (await conn.QueryAsync<JourneyRow>(
            "SELECT id, name, description, book_id FROM journeys ORDER BY id")).ToList();
        var rels = (await conn.QueryAsync<RelRow>(
            "SELECT person_id_1, person_id_2, relationship_type FROM person_relationships ORDER BY person_id_1, person_id_2, relationship_type")).ToList();

        var personEvents = (await conn.QueryAsync<PersonEventRow>("""
            SELECT pe.person_id, pe.event_id, pe.role_in_event AS role
            FROM person_events pe
            LEFT JOIN events e ON e.id = pe.event_id
            ORDER BY pe.person_id, (e.start_year IS NULL), e.start_year, pe.event_id
            """)).ToList();
        var personScripture = (await conn.QueryAsync<PersonScriptureRow>("""
            SELECT ps.person_id, sr.reference_text AS ref, ps.context
            FROM person_scripture ps
            JOIN scripture_references sr ON sr.id = ps.scripture_id
            ORDER BY ps.person_id, sr.id
            """)).ToList();
        var eventScripture = (await conn.QueryAsync<EventScriptureRow>("""
            SELECT es.event_id, sr.reference_text AS ref
            FROM event_scripture es
            JOIN scripture_references sr ON sr.id = es.scripture_id
            ORDER BY es.event_id, sr.id
            """)).ToList();
        var eventLocations = (await conn.QueryAsync<EventLocationRow>(
            "SELECT event_id, location_id FROM event_locations ORDER BY event_id, location_id")).ToList();
        var journeyPeople = (await conn.QueryAsync<JourneyPersonRow>(
            "SELECT journey_id, person_id FROM journey_people ORDER BY journey_id, person_id")).ToList();
        var stops = (await conn.QueryAsync<StopRow>(
            "SELECT journey_id, sort_order, location_id, event_id, label, description, year, chapter FROM journey_stops ORDER BY journey_id, sort_order, id")).ToList();

        // Slugs (each table has its own namespace)
        var personSlugs = Slugger.Assign(people.Select(p => (p.Id, (string?)p.Name, Slugger.SignificanceRank(p.Significance))), "person");
        var eventSlugs = Slugger.Assign(events.Select(e => (e.Id, (string?)e.Name, Slugger.SignificanceRank(e.Significance))), "event");
        var locationSlugs = Slugger.Assign(locations.Select(l => (l.Id, (string?)l.Name, 0)), "location");
        var periodSlugs = Slugger.Assign(periods.Select(p => (p.Id, (string?)p.Name, 0)), "period");
        var journeySlugs = Slugger.Assign(journeys.Select(j => (j.Id, (string?)j.Name, 0)), "journey");
        var bookSlugs = Slugger.Assign(books.Select(b =>
        {
            var s = Slugger.Slugify(b.Name);
            return (b.Id, (string?)(BookSlugAliases.TryGetValue(s, out var a) ? a : s), 0);
        }), "book");

        var eventsByPerson = personEvents.GroupBy(x => x.PersonId)
            .ToDictionary(g => g.Key, g => g.Select(x => new DatasetPersonEventDto { Id = x.EventId, Role = x.Role }).ToList());
        var scriptureByPerson = personScripture.GroupBy(x => x.PersonId)
            .ToDictionary(g => g.Key, g => g.Select(x => new DatasetPersonScriptureDto { Ref = x.Ref, Context = x.Context }).ToList());

        var personOrder = people.Select((p, i) => (p.Id, i)).ToDictionary(x => x.Id, x => x.i);
        var peopleByEvent = personEvents.GroupBy(x => x.EventId)
            .ToDictionary(g => g.Key, g => g
                .OrderBy(x => personOrder.TryGetValue(x.PersonId, out var i) ? i : int.MaxValue)
                .ThenBy(x => x.PersonId)
                .Select(x => new DatasetEventPersonDto { Id = x.PersonId, Role = x.Role }).ToList());
        var scriptureByEvent = eventScripture.GroupBy(x => x.EventId)
            .ToDictionary(g => g.Key, g => g.Select(x => new DatasetEventScriptureDto { Ref = x.Ref }).ToList());
        var locationsByEvent = eventLocations.GroupBy(x => x.EventId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.LocationId).ToList());
        var peopleByJourney = journeyPeople.GroupBy(x => x.JourneyId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.PersonId).ToList());
        var stopsByJourney = stops.GroupBy(x => x.JourneyId)
            .ToDictionary(g => g.Key, g => g.Select(x => new DatasetJourneyStopDto
            {
                Order = x.SortOrder, LocationId = x.LocationId, EventId = x.EventId, Label = x.Label,
                Description = x.Description, Year = x.Year, Chapter = x.Chapter
            }).ToList());

        return new DatasetDto
        {
            Meta = new DatasetMetaDto
            {
                Version = 2,
                GeneratedAt = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'", CultureInfo.InvariantCulture),
                Chronology = "ussher",
                Counts = new DatasetCountsDto { People = people.Count, Events = events.Count, Locations = locations.Count }
            },
            Periods = periods.Select(p => new DatasetPeriodDto
            {
                Id = p.Id, Slug = periodSlugs[p.Id], Name = p.Name, StartYear = p.StartYear, EndYear = p.EndYear,
                Color = p.Color, SortOrder = p.SortOrder, Description = p.Description
            }).ToList(),
            People = people.Select(p => new DatasetPersonDto
            {
                Id = p.Id, Slug = personSlugs[p.Id], Name = p.Name,
                AltNames = (p.AltNames ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList(),
                BirthYear = p.BirthYear, DeathYear = p.DeathYear, BirthApprox = p.BirthApprox, DeathApprox = p.DeathApprox,
                DateConfidence = p.DateConfidence, Role = p.Role, Significance = p.Significance, Tribe = p.Tribe,
                FatherId = p.FatherId, MotherId = p.MotherId, Description = p.Description, DateNotes = p.DateNotes,
                Events = eventsByPerson.GetValueOrDefault(p.Id) ?? [],
                Scripture = scriptureByPerson.GetValueOrDefault(p.Id) ?? []
            }).ToList(),
            Events = events.Select(e => new DatasetEventDto
            {
                Id = e.Id, Slug = eventSlugs[e.Id], Name = e.Name, StartYear = e.StartYear, EndYear = e.EndYear,
                StartApprox = e.StartApprox, EndApprox = e.EndApprox, DateConfidence = e.DateConfidence,
                Category = e.Category, Significance = e.Significance, Description = e.Description,
                DateNotes = e.DateNotes, SortOrder = e.SortOrder,
                People = peopleByEvent.GetValueOrDefault(e.Id) ?? [],
                LocationIds = locationsByEvent.GetValueOrDefault(e.Id) ?? [],
                Scripture = scriptureByEvent.GetValueOrDefault(e.Id) ?? []
            }).ToList(),
            Relationships = rels.Select(r => new DatasetRelationshipDto { A = r.PersonId1, B = r.PersonId2, Type = r.RelationshipType }).ToList(),
            Locations = locations.Select(l => new DatasetLocationDto
            {
                Id = l.Id, Slug = locationSlugs[l.Id], Name = l.Name, ModernName = l.ModernName,
                Lat = l.Latitude, Lng = l.Longitude, Region = l.Region, Description = l.Description
            }).ToList(),
            Books = books.Select(b => new DatasetBookDto
            {
                Id = b.Id, Slug = bookSlugs[b.Id], Name = b.Name, Abbreviation = b.Abbreviation, Testament = b.Testament,
                Genre = b.Genre, WritingYear = b.ApproxWritingYear, CoversStart = b.PeriodCoveredStart, CoversEnd = b.PeriodCoveredEnd
            }).ToList(),
            Journeys = journeys.Select(j => new DatasetJourneyDto
            {
                Id = j.Id, Slug = journeySlugs[j.Id], Name = j.Name, Description = j.Description, BookId = j.BookId,
                PersonIds = peopleByJourney.GetValueOrDefault(j.Id) ?? [],
                Stops = stopsByJourney.GetValueOrDefault(j.Id) ?? []
            }).ToList()
        };
    }
}

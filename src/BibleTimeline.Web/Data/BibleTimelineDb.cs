using Dapper;
using Microsoft.Data.Sqlite;
using BibleTimeline.Web.Models;

namespace BibleTimeline.Web.Data;

public class BibleTimelineDb
{
    private readonly string _connectionString;

    public BibleTimelineDb(string connectionString)
    {
        _connectionString = connectionString;
        Dapper.DefaultTypeMap.MatchNamesWithUnderscores = true;
    }

    private SqliteConnection CreateConnection()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        return conn;
    }

    // ── Timeline Queries ──────────────────────────────────────────

    public async Task<IEnumerable<TimelineItemDto>> GetTimelineItemsAsync(TimelineQueryParams query)
    {
        using var conn = CreateConnection();
        var items = new List<TimelineItemDto>();

        if (query.IncludePeople)
        {
            var people = await GetTimelinePeopleAsync(conn, query);
            items.AddRange(people);
        }

        if (query.IncludeEvents)
        {
            var events = await GetTimelineEventsAsync(conn, query);
            items.AddRange(events);
        }

        return items.OrderBy(i => i.StartYear ?? int.MaxValue);
    }

    private async Task<IEnumerable<TimelineItemDto>> GetTimelinePeopleAsync(SqliteConnection conn, TimelineQueryParams query)
    {
        var sql = """
            SELECT id, 'person' as type, name, birth_year as StartYear, death_year as EndYear,
                   birth_approx as StartApprox, death_approx as EndApprox,
                   date_confidence as DateConfidence, significance, role as Category,
                   description, date_notes as DateNotes
            FROM people
            WHERE 1=1
            """;

        var parameters = new DynamicParameters();
        sql = ApplyFilters(sql, parameters, query, isPeople: true);

        return await conn.QueryAsync<TimelineItemDto>(sql, parameters);
    }

    private async Task<IEnumerable<TimelineItemDto>> GetTimelineEventsAsync(SqliteConnection conn, TimelineQueryParams query)
    {
        var sql = """
            SELECT id, 'event' as type, name, start_year as StartYear, end_year as EndYear,
                   start_approx as StartApprox, end_approx as EndApprox,
                   date_confidence as DateConfidence, significance, category as Category,
                   description, date_notes as DateNotes
            FROM events
            WHERE 1=1
            """;

        var parameters = new DynamicParameters();
        sql = ApplyFilters(sql, parameters, query, isPeople: false);

        return await conn.QueryAsync<TimelineItemDto>(sql, parameters);
    }

    private static string ApplyFilters(string sql, DynamicParameters parameters, TimelineQueryParams query, bool isPeople)
    {
        if (query.StartYear.HasValue)
        {
            var yearCol = isPeople ? "death_year" : "end_year";
            var startCol = isPeople ? "birth_year" : "start_year";
            sql += $" AND ({yearCol} IS NULL OR {yearCol} >= @StartYear OR {startCol} >= @StartYear)";
            parameters.Add("StartYear", query.StartYear.Value);
        }

        if (query.EndYear.HasValue)
        {
            var col = isPeople ? "birth_year" : "start_year";
            sql += $" AND ({col} IS NULL OR {col} <= @EndYear)";
            parameters.Add("EndYear", query.EndYear.Value);
        }

        if (!string.IsNullOrEmpty(query.Significance))
        {
            sql += " AND significance = @Significance";
            parameters.Add("Significance", query.Significance);
        }

        if (!string.IsNullOrEmpty(query.DateConfidence))
        {
            sql += " AND date_confidence = @DateConfidence";
            parameters.Add("DateConfidence", query.DateConfidence);
        }

        if (isPeople)
        {
            if (!string.IsNullOrEmpty(query.Role))
            {
                sql += " AND role = @Role";
                parameters.Add("Role", query.Role);
            }
            if (!string.IsNullOrEmpty(query.Tribe))
            {
                sql += " AND tribe = @Tribe";
                parameters.Add("Tribe", query.Tribe);
            }
        }
        else
        {
            if (!string.IsNullOrEmpty(query.Category))
            {
                sql += " AND category = @Category";
                parameters.Add("Category", query.Category);
            }
        }

        if (!string.IsNullOrEmpty(query.Period))
        {
            var periodCol = isPeople ? "birth_year" : "start_year";
            sql += $"""
                 AND {periodCol} >= (SELECT start_year FROM time_periods WHERE name = @Period)
                 AND {periodCol} <= (SELECT end_year FROM time_periods WHERE name = @Period)
                """;
            parameters.Add("Period", query.Period);
        }

        if (!string.IsNullOrEmpty(query.Testament))
        {
            // OT: items before ~5 BC; NT: items from ~5 BC onward
            var col = isPeople ? "birth_year" : "start_year";
            if (query.Testament == "OT")
            {
                sql += $" AND {col} < -5";
            }
            else if (query.Testament == "NT")
            {
                sql += $" AND {col} >= -5";
            }
        }

        if (query.BookId.HasValue)
        {
            var idCol = isPeople ? "p.id" : "e.id";
            var junction = isPeople ? "person_scripture" : "event_scripture";
            var fkCol = isPeople ? "person_id" : "event_id";
            // Use the table alias from the outer query
            var table = isPeople ? "people" : "events";
            sql += $" AND id IN (SELECT js.{fkCol} FROM {junction} js JOIN scripture_references sr ON sr.id = js.scripture_id WHERE sr.book_id = @BookId)";
            parameters.Add("BookId", query.BookId.Value);
        }

        if (query.LocationId.HasValue && !isPeople)
        {
            sql += " AND id IN (SELECT event_id FROM event_locations WHERE location_id = @LocationId)";
            parameters.Add("LocationId", query.LocationId.Value);
        }

        return sql;
    }

    // ── People ────────────────────────────────────────────────────

    public async Task<PersonDetailDto?> GetPersonDetailAsync(int id)
    {
        using var conn = CreateConnection();

        var person = await conn.QueryFirstOrDefaultAsync<Person>(
            "SELECT * FROM people WHERE id = @Id", new { Id = id });

        if (person is null) return null;

        var events = await conn.QueryAsync<EventSummaryDto>("""
            SELECT e.id, e.name, e.category, pe.role_in_event as RoleInEvent
            FROM events e
            JOIN person_events pe ON pe.event_id = e.id
            WHERE pe.person_id = @Id
            ORDER BY e.start_year
            """, new { Id = id });

        var relationships = await conn.QueryAsync<RelatedPersonDto>("""
            SELECT p.id, p.name, p.role, pr.relationship_type as RelationshipType
            FROM people p
            JOIN person_relationships pr ON pr.person_id_2 = p.id
            WHERE pr.person_id_1 = @Id
            """, new { Id = id });

        var scriptures = await conn.QueryAsync<ScriptureReference>("""
            SELECT sr.*
            FROM scripture_references sr
            JOIN person_scripture ps ON ps.scripture_id = sr.id
            WHERE ps.person_id = @Id
            """, new { Id = id });

        return new PersonDetailDto
        {
            Id = person.Id,
            Name = person.Name,
            AltNames = person.AltNames,
            BirthYear = person.BirthYear,
            DeathYear = person.DeathYear,
            BirthApprox = person.BirthApprox,
            DeathApprox = person.DeathApprox,
            DateConfidence = person.DateConfidence,
            Role = person.Role,
            Significance = person.Significance,
            Tribe = person.Tribe,
            Description = person.Description,
            DateNotes = person.DateNotes,
            Events = events.ToList(),
            Relationships = relationships.ToList(),
            ScriptureReferences = scriptures.ToList()
        };
    }

    // ── Events ────────────────────────────────────────────────────

    public async Task<EventDetailDto?> GetEventDetailAsync(int id)
    {
        using var conn = CreateConnection();

        var evt = await conn.QueryFirstOrDefaultAsync<Event>(
            "SELECT * FROM events WHERE id = @Id", new { Id = id });

        if (evt is null) return null;

        var people = await conn.QueryAsync<PersonSummaryDto>("""
            SELECT p.id, p.name, p.role, pe.role_in_event as RoleInEvent
            FROM people p
            JOIN person_events pe ON pe.person_id = p.id
            WHERE pe.event_id = @Id
            ORDER BY p.birth_year
            """, new { Id = id });

        var scriptures = await conn.QueryAsync<ScriptureReference>("""
            SELECT sr.*
            FROM scripture_references sr
            JOIN event_scripture es ON es.scripture_id = sr.id
            WHERE es.event_id = @Id
            """, new { Id = id });

        var locations = await conn.QueryAsync<Location>("""
            SELECT l.*
            FROM locations l
            JOIN event_locations el ON el.location_id = l.id
            WHERE el.event_id = @Id
            """, new { Id = id });

        return new EventDetailDto
        {
            Id = evt.Id,
            Name = evt.Name,
            StartYear = evt.StartYear,
            EndYear = evt.EndYear,
            StartApprox = evt.StartApprox,
            EndApprox = evt.EndApprox,
            DateConfidence = evt.DateConfidence,
            Category = evt.Category,
            Significance = evt.Significance,
            Description = evt.Description,
            DateNotes = evt.DateNotes,
            People = people.ToList(),
            ScriptureReferences = scriptures.ToList(),
            Locations = locations.ToList()
        };
    }

    // ── Time Periods ──────────────────────────────────────────────

    public async Task<IEnumerable<TimePeriod>> GetTimePeriodsAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<TimePeriod>(
            "SELECT * FROM time_periods ORDER BY sort_order");
    }

    // ── Biblical Books ────────────────────────────────────────────

    public async Task<IEnumerable<BiblicalBook>> GetBiblicalBooksAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<BiblicalBook>(
            "SELECT * FROM biblical_books ORDER BY id");
    }

    // ── Search ────────────────────────────────────────────────────

    public async Task<IEnumerable<SearchResultDto>> SearchAsync(string query, string? type = null)
    {
        using var conn = CreateConnection();
        var results = new List<SearchResultDto>();
        var ftsQuery = $"{query}*"; // prefix matching

        if (type is null or "person")
        {
            var people = await conn.QueryAsync<SearchResultDto>("""
                SELECT p.id, 'person' as Type, p.name, p.description as Snippet, p.birth_year as StartYear
                FROM people p
                JOIN people_fts fts ON fts.rowid = p.id
                WHERE people_fts MATCH @Query
                ORDER BY rank
                LIMIT 20
                """, new { Query = ftsQuery });
            results.AddRange(people);
        }

        if (type is null or "event")
        {
            var events = await conn.QueryAsync<SearchResultDto>("""
                SELECT e.id, 'event' as Type, e.name, e.description as Snippet, e.start_year as StartYear
                FROM events e
                JOIN events_fts fts ON fts.rowid = e.id
                WHERE events_fts MATCH @Query
                ORDER BY rank
                LIMIT 20
                """, new { Query = ftsQuery });
            results.AddRange(events);
        }

        if (type is null or "book")
        {
            var books = await conn.QueryAsync<SearchResultDto>("""
                SELECT id, 'book' as Type, name, genre as Snippet, approx_writing_year as StartYear
                FROM biblical_books
                WHERE name LIKE @Like OR abbreviation LIKE @Like
                ORDER BY id
                LIMIT 20
                """, new { Like = $"%{query}%" });
            results.AddRange(books);
        }

        return results;
    }

    // ── Lineage ───────────────────────────────────────────────────

    public async Task<List<LineagePersonDto>> GetPeopleListAsync()
    {
        using var conn = CreateConnection();
        var people = await conn.QueryAsync<LineagePersonDto>(
            "SELECT id, name, birth_year, death_year, birth_approx, death_approx, role, father_id, mother_id FROM people ORDER BY name");
        return people.ToList();
    }

    public async Task<LineageDto?> GetLineageAsync(int id)
    {
        using var conn = CreateConnection();

        var subject = await conn.QueryFirstOrDefaultAsync<LineagePersonDto>(
            "SELECT id, name, birth_year, death_year, birth_approx, death_approx, role, father_id, mother_id FROM people WHERE id = @Id",
            new { Id = id });

        if (subject is null) return null;

        // Ancestors via recursive CTE (walk up father_id and mother_id)
        var ancestors = (await conn.QueryAsync<LineagePersonDto>("""
            WITH RECURSIVE anc(id) AS (
                SELECT father_id FROM people WHERE id = @Id AND father_id IS NOT NULL
                UNION
                SELECT mother_id FROM people WHERE id = @Id AND mother_id IS NOT NULL
                UNION
                SELECT p.father_id FROM people p JOIN anc a ON p.id = a.id WHERE p.father_id IS NOT NULL
                UNION
                SELECT p.mother_id FROM people p JOIN anc a ON p.id = a.id WHERE p.mother_id IS NOT NULL
            )
            SELECT id, name, birth_year, death_year, birth_approx, death_approx, role, father_id, mother_id
            FROM people WHERE id IN (SELECT id FROM anc)
            """, new { Id = id })).ToList();

        // Descendants via recursive CTE (walk down — find children)
        var descendants = (await conn.QueryAsync<LineagePersonDto>("""
            WITH RECURSIVE desc_ids(id) AS (
                SELECT id FROM people WHERE father_id = @Id OR mother_id = @Id
                UNION
                SELECT p.id FROM people p JOIN desc_ids d ON p.father_id = d.id OR p.mother_id = d.id
            )
            SELECT id, name, birth_year, death_year, birth_approx, death_approx, role, father_id, mother_id
            FROM people WHERE id IN (SELECT id FROM desc_ids)
            """, new { Id = id })).ToList();

        // Siblings: people who share at least one parent with the subject
        var siblings = (await conn.QueryAsync<LineagePersonDto>("""
            SELECT id, name, birth_year, death_year, birth_approx, death_approx, role, father_id, mother_id
            FROM people
            WHERE id != @Id
              AND (
                (father_id IS NOT NULL AND father_id IN (
                    SELECT father_id FROM people WHERE id = @Id AND father_id IS NOT NULL
                ))
                OR
                (mother_id IS NOT NULL AND mother_id IN (
                    SELECT mother_id FROM people WHERE id = @Id AND mother_id IS NOT NULL
                ))
              )
            """, new { Id = id })).ToList();

        // Extended family: children of ancestors (Cain, Abel, Esau, etc.)
        // These are people whose parent is an ancestor but who aren't ancestors themselves
        var alreadyIncluded = new HashSet<int>(ancestors.Select(a => a.Id))
        {
            id
        };
        foreach (var d in descendants) alreadyIncluded.Add(d.Id);
        foreach (var s in siblings) alreadyIncluded.Add(s.Id);

        var ancestorIds = ancestors.Select(a => a.Id).Append(id).ToList();
        var extendedFamily = (await conn.QueryAsync<LineagePersonDto>("""
            SELECT id, name, birth_year, death_year, birth_approx, death_approx, role, father_id, mother_id
            FROM people
            WHERE (father_id IN @Ids OR mother_id IN @Ids)
            """, new { Ids = ancestorIds })).ToList();

        // Remove anyone already in ancestors/descendants/siblings/subject
        extendedFamily = extendedFamily.Where(e => !alreadyIncluded.Contains(e.Id)).ToList();

        return new LineageDto
        {
            Subject = subject,
            Ancestors = ancestors,
            Descendants = descendants,
            Siblings = siblings,
            ExtendedFamily = extendedFamily
        };
    }

    // ── Filters ───────────────────────────────────────────────────

    public async Task<FilterOptionsDto> GetFilterOptionsAsync()
    {
        using var conn = CreateConnection();

        var roles = (await conn.QueryAsync<string>(
            "SELECT DISTINCT role FROM people WHERE role IS NOT NULL ORDER BY role")).ToList();

        var categories = (await conn.QueryAsync<string>(
            "SELECT DISTINCT category FROM events WHERE category IS NOT NULL ORDER BY category")).ToList();

        var tribes = (await conn.QueryAsync<string>(
            "SELECT DISTINCT tribe FROM people WHERE tribe IS NOT NULL ORDER BY tribe")).ToList();

        var genres = (await conn.QueryAsync<string>(
            "SELECT DISTINCT genre FROM biblical_books WHERE genre IS NOT NULL ORDER BY genre")).ToList();

        var periods = (await conn.QueryAsync<TimePeriod>(
            "SELECT * FROM time_periods ORDER BY sort_order")).ToList();

        var dateConfidences = (await conn.QueryAsync<string>("""
            SELECT DISTINCT date_confidence FROM people WHERE date_confidence IS NOT NULL
            UNION
            SELECT DISTINCT date_confidence FROM events WHERE date_confidence IS NOT NULL
            ORDER BY 1
            """)).ToList();

        var locations = (await conn.QueryAsync<LocationOption>(
            "SELECT id, name FROM locations ORDER BY name")).ToList();

        var books = (await conn.QueryAsync<BookOption>(
            "SELECT id, name, testament FROM biblical_books ORDER BY id")).ToList();

        return new FilterOptionsDto
        {
            Roles = roles,
            EventCategories = categories,
            Tribes = tribes,
            Genres = genres,
            TimePeriods = periods,
            DateConfidences = dateConfidences,
            Locations = locations,
            Books = books
        };
    }

    // ── Map ───────────────────────────────────────────────────────

    public async Task<IEnumerable<MapEventDto>> GetMapEventsAsync(int? startYear, int? endYear)
    {
        using var conn = CreateConnection();
        var sql = """
            SELECT e.id AS EventId, e.name AS EventName,
                   e.start_year AS StartYear, e.end_year AS EndYear,
                   e.category, e.significance,
                   l.id AS LocationId, l.name AS LocationName, l.modern_name AS ModernName,
                   l.latitude, l.longitude
            FROM events e
            JOIN event_locations el ON el.event_id = e.id
            JOIN locations l ON l.id = el.location_id
            WHERE l.latitude IS NOT NULL
            """;
        var parameters = new DynamicParameters();
        if (startYear.HasValue)
        {
            sql += " AND COALESCE(e.start_year, e.end_year) >= @StartYear";
            parameters.Add("StartYear", startYear.Value);
        }
        if (endYear.HasValue)
        {
            sql += " AND COALESCE(e.start_year, e.end_year) <= @EndYear";
            parameters.Add("EndYear", endYear.Value);
        }
        sql += " ORDER BY e.sort_order, COALESCE(e.start_year, e.end_year)";
        return await conn.QueryAsync<MapEventDto>(sql, parameters);
    }

    public async Task<IEnumerable<JourneyStepDto>> GetJourneyAsync(int personId, int? startYear, int? endYear)
    {
        using var conn = CreateConnection();
        var sql = """
            SELECT e.id AS EventId, e.name AS EventName,
                   e.start_year AS StartYear, e.end_year AS EndYear,
                   e.category, pe.role_in_event AS RoleInEvent,
                   l.id AS LocationId, l.name AS LocationName,
                   l.latitude, l.longitude
            FROM person_events pe
            JOIN events e ON e.id = pe.event_id
            JOIN event_locations el ON el.event_id = e.id
            JOIN locations l ON l.id = el.location_id
            WHERE pe.person_id = @PersonId AND l.latitude IS NOT NULL
            """;
        var parameters = new DynamicParameters();
        parameters.Add("PersonId", personId);
        if (startYear.HasValue)
        {
            sql += " AND COALESCE(e.start_year, e.end_year) >= @StartYear";
            parameters.Add("StartYear", startYear.Value);
        }
        if (endYear.HasValue)
        {
            sql += " AND COALESCE(e.start_year, e.end_year) <= @EndYear";
            parameters.Add("EndYear", endYear.Value);
        }
        sql += " ORDER BY e.sort_order, COALESCE(e.start_year, e.end_year)";
        return await conn.QueryAsync<JourneyStepDto>(sql, parameters);
    }

    public async Task<IEnumerable<MapPersonDto>> GetMapPeopleAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<MapPersonDto>("""
            SELECT p.id, p.name, COUNT(DISTINCT el.event_id) AS EventCount
            FROM people p
            JOIN person_events pe ON pe.person_id = p.id
            JOIN event_locations el ON el.event_id = pe.event_id
            JOIN locations l ON l.id = el.location_id
            WHERE l.latitude IS NOT NULL
            GROUP BY p.id, p.name
            HAVING COUNT(DISTINCT el.event_id) >= 2
            ORDER BY p.name
            """);
    }

    public async Task<IEnumerable<Location>> GetLocationsAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<Location>(
            "SELECT * FROM locations WHERE latitude IS NOT NULL ORDER BY name");
    }

    // ── Book Journeys ─────────────────────────────────────────

    public async Task<IEnumerable<BookJourneyListDto>> GetBookJourneysAsync()
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<BookJourneyListDto>("""
            SELECT j.id, j.name, j.description,
                   COUNT(js.id) AS StopCount
            FROM journeys j
            JOIN journey_stops js ON js.journey_id = j.id
            GROUP BY j.id, j.name, j.description
            ORDER BY j.name
            """);
    }

    public async Task<IEnumerable<BookJourneyStopDto>> GetBookJourneyStopsAsync(int journeyId)
    {
        using var conn = CreateConnection();
        return await conn.QueryAsync<BookJourneyStopDto>("""
            SELECT COALESCE(js.event_id, 0) AS EventId,
                   js.label AS EventName,
                   js.year AS StartYear,
                   NULL AS EndYear,
                   COALESCE(e.category, 'other') AS Category,
                   js.chapter AS RoleInEvent,
                   l.id AS LocationId,
                   l.name AS LocationName,
                   l.latitude, l.longitude,
                   js.chapter,
                   js.description AS StopDescription
            FROM journey_stops js
            JOIN locations l ON l.id = js.location_id
            LEFT JOIN events e ON e.id = js.event_id
            WHERE js.journey_id = @JourneyId AND l.latitude IS NOT NULL
            ORDER BY js.sort_order
            """, new { JourneyId = journeyId });
    }
}

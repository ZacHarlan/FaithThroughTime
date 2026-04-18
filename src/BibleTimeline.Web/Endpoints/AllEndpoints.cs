using BibleTimeline.Web.Data;
using BibleTimeline.Web.Models;

namespace BibleTimeline.Web.Endpoints;

public static class TimelineEndpoints
{
    public static void MapTimelineEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/timeline");

        group.MapGet("/", async (
            BibleTimelineDb db,
            int? startYear,
            int? endYear,
            string? role,
            string? category,
            string? significance,
            string? period,
            string? tribe,
            string? dateConfidence,
            string? testament,
            int? bookId,
            int? locationId,
            bool? includePeople,
            bool? includeEvents) =>
        {
            var query = new TimelineQueryParams
            {
                StartYear = startYear,
                EndYear = endYear,
                Role = role,
                Category = category,
                Significance = significance,
                Period = period,
                Tribe = tribe,
                DateConfidence = dateConfidence,
                Testament = testament,
                BookId = bookId,
                LocationId = locationId,
                IncludePeople = includePeople ?? true,
                IncludeEvents = includeEvents ?? true
            };

            var items = await db.GetTimelineItemsAsync(query);
            return Results.Ok(items);
        });

        group.MapGet("/periods", async (BibleTimelineDb db) =>
        {
            var periods = await db.GetTimePeriodsAsync();
            return Results.Ok(periods);
        });

        group.MapGet("/books", async (BibleTimelineDb db) =>
        {
            var books = await db.GetBiblicalBooksAsync();
            return Results.Ok(books);
        });

        group.MapGet("/filters", async (BibleTimelineDb db) =>
        {
            var options = await db.GetFilterOptionsAsync();
            return Results.Ok(options);
        });
    }
}

public static class PersonEndpoints
{
    public static void MapPersonEndpoints(this WebApplication app)
    {
        app.MapGet("/api/people/{id:int}", async (int id, BibleTimelineDb db) =>
        {
            var person = await db.GetPersonDetailAsync(id);
            return person is not null ? Results.Ok(person) : Results.NotFound();
        });
    }
}

public static class EventEndpoints
{
    public static void MapEventEndpoints(this WebApplication app)
    {
        app.MapGet("/api/events/{id:int}", async (int id, BibleTimelineDb db) =>
        {
            var evt = await db.GetEventDetailAsync(id);
            return evt is not null ? Results.Ok(evt) : Results.NotFound();
        });
    }
}

public static class SearchEndpoints
{
    public static void MapSearchEndpoints(this WebApplication app)
    {
        app.MapGet("/api/search", async (string q, string? type, BibleTimelineDb db) =>
        {
            if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
                return Results.BadRequest("Query must be at least 2 characters.");

            var results = await db.SearchAsync(q, type);
            return Results.Ok(results);
        });
    }
}

public static class LineageEndpoints
{
    public static void MapLineageEndpoints(this WebApplication app)
    {
        app.MapGet("/api/lineage/people", async (BibleTimelineDb db) =>
        {
            var people = await db.GetPeopleListAsync();
            return Results.Ok(people);
        });

        app.MapGet("/api/lineage/{id:int}", async (int id, BibleTimelineDb db) =>
        {
            var lineage = await db.GetLineageAsync(id);
            return lineage is not null ? Results.Ok(lineage) : Results.NotFound();
        });
    }
}

public static class MapEndpoints
{
    public static void MapMapEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/map");

        group.MapGet("/events", async (BibleTimelineDb db, int? startYear, int? endYear) =>
        {
            var events = await db.GetMapEventsAsync(startYear, endYear);
            return Results.Ok(events);
        });

        group.MapGet("/journey/{personId:int}", async (int personId, BibleTimelineDb db, int? startYear, int? endYear) =>
        {
            var steps = await db.GetJourneyAsync(personId, startYear, endYear);
            return Results.Ok(steps);
        });

        group.MapGet("/people", async (BibleTimelineDb db) =>
        {
            var people = await db.GetMapPeopleAsync();
            return Results.Ok(people);
        });

        group.MapGet("/locations", async (BibleTimelineDb db) =>
        {
            var locations = await db.GetLocationsAsync();
            return Results.Ok(locations);
        });

        group.MapGet("/journeys", async (BibleTimelineDb db) =>
        {
            var journeys = await db.GetBookJourneysAsync();
            return Results.Ok(journeys);
        });

        group.MapGet("/journeys/{journeyId:int}", async (int journeyId, BibleTimelineDb db) =>
        {
            var stops = await db.GetBookJourneyStopsAsync(journeyId);
            return Results.Ok(stops);
        });
    }
}
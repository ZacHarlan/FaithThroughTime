using BibleTimeline.Web.Data;

namespace BibleTimeline.Web.Endpoints;

public static class DatasetEndpoints
{
    public static void MapDatasetEndpoints(this WebApplication app)
    {
        // Same payload on both routes; the relative URL data/dataset.json also works on the static export.
        app.MapGet("/api/dataset", ServeDataset);
        app.MapGet("/data/dataset.json", ServeDataset);
    }

    private static async Task<IResult> ServeDataset(BibleTimelineDb db, HttpContext ctx)
    {
        var json = await db.GetDatasetJsonAsync();
        ctx.Response.Headers.CacheControl = "public, max-age=300";
        return Results.Bytes(json, "application/json; charset=utf-8");
    }
}

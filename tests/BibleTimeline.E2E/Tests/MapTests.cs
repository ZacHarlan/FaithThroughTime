using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class MapTests : E2ETest
{
    [Test]
    public async Task Places_render_on_the_map()
    {
        await Open("#/map");
        await WaitForMap();
        var pins = await Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex(@", \d+ events?$") }).CountAsync();
        Assert.That(pins, Is.GreaterThan(5));
    }

    [Test]
    public async Task Journey_stepper_starts_at_stop_1_and_Next_advances_it_and_the_url()
    {
        await Open("#/map/book-of-exodus");
        await WaitForMap();
        await Expect(Page.GetByText(new Regex(@"^Stop 1 of \d+$"))).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Next stop" }).ClickAsync();
        await Expect(Page.GetByText(new Regex(@"^Stop 2 of \d+$"))).ToBeVisibleAsync();
        await ExpectHash("/map/book-of-exodus\\?.*step=2");
    }

    [Test]
    public async Task Place_query_opens_that_places_card()
    {
        await Open("#/");
        var place = await Eval<System.Text.Json.JsonElement>(
            "(() => { const l = Store.locations.find(x => x.lat != null && x.lng != null && Store.eventsAt(x).length); return { slug: l.slug, name: l.name }; })()");
        var slug = place.GetProperty("slug").GetString()!;
        var name = place.GetProperty("name").GetString()!;
        await NavigateTo($"#/map?place={slug}");
        await WaitForMap();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = name, Exact = true })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Close the place" })).ToBeVisibleAsync();
    }
}

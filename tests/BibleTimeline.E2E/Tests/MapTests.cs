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

    // While a journey plays, the drawn line's tip must stay on the route. It once drifted up to
    // 70px off it, because the map ran a flyTo alongside the line and Leaflet only re-projects the
    // route layer when a fly ends.
    [Test]
    public async Task Playing_a_journey_keeps_the_drawn_line_on_the_route()
    {
        // The suite runs with reduced motion, which skips the animation this test is about.
        await Page.EmulateMediaAsync(new() { ReducedMotion = ReducedMotion.NoPreference });
        await Open("#/map/book-of-acts");
        await WaitForMap();
        await Page.EvaluateAsync(@"() => {
            window.__drift = [];
            const loop = () => {
                const d = document.querySelector('.map-route-done'), a = document.querySelector('.map-route-ahead');
                if (d && a && d.getTotalLength() > 0) {
                    const q = d.getPointAtLength(d.getTotalLength());
                    const tip = new DOMPoint(q.x, q.y).matrixTransform(d.getScreenCTM());
                    const m = a.getScreenCTM(), len = a.getTotalLength();
                    let best = Infinity;
                    for (let i = 0; i <= 800; i++) {
                        const r = a.getPointAtLength(len * i / 800);
                        const s = new DOMPoint(r.x, r.y).matrixTransform(m);
                        best = Math.min(best, Math.hypot(s.x - tip.x, s.y - tip.y));
                    }
                    window.__drift.push(best);
                }
                window.__driftRaf = requestAnimationFrame(loop);
            };
            loop();
        }");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Play the journey" }).ClickAsync();
        await Page.WaitForTimeoutAsync(14000);
        var drift = await Page.EvaluateAsync<double[]>("() => { cancelAnimationFrame(window.__driftRaf); return window.__drift; }");
        Assert.That(drift.Length, Is.GreaterThan(60), "the line should have been drawing for several seconds");
        Assert.That(drift.Max(), Is.LessThan(6), "the tip of the drawn line left the route");
    }
}

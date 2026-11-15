using BibleTimeline.E2E.Support;

namespace BibleTimeline.E2E.Tests;

// js/analytics.js: one page_view per route with a clean path; nothing sent off the live site.
public class AnalyticsTests : E2ETest
{
    [Test]
    public async Task Off_the_live_site_Google_Analytics_is_never_loaded()
    {
        var requested = new List<string>();
        Page.Request += (_, r) => { if (r.Url.Contains("googletagmanager.com") || r.Url.Contains("google-analytics.com")) requested.Add(r.Url); };
        await Open("#/");
        await NavigateTo("#/person/david");
        Assert.That(await Eval<bool>("Analytics.live"), Is.False);
        Assert.That(await Eval<bool>("typeof window.gtag === 'undefined'"), Is.True);
        Assert.That(requested, Is.Empty, "development and test traffic must not reach the property");
    }

    [Test]
    public async Task Each_route_is_one_page_view_with_a_clean_path_and_panning_is_not_counted()
    {
        await Open("#/timeline?y=-1000&span=400");
        await NavigateTo("#/person/david");
        await NavigateTo("#/meet/noah/abraham");
        // A view-state update (what the timeline does while panning) is not a page.
        await Page.EvaluateAsync("() => Router.replace('#/meet/noah/abraham?x=1')");
        await Page.WaitForTimeoutAsync(200);

        var paths = await Eval<string[]>("Analytics.log.filter(e => e.name === 'page_view').map(e => e.params.page_path)");
        Assert.That(paths, Is.EqualTo(new[] { "/timeline", "/person/david", "/meet/noah/abraham" }));
    }
}

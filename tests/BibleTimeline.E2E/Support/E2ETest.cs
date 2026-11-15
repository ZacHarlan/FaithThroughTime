using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Playwright;
using BibleTimeline.E2E;

namespace BibleTimeline.E2E.Support;


/// <summary>
/// Base class: a fresh browser context and page per test, third-party hosts blocked (the suite is hermetic
/// and fast), and any uncaught page error fails the test.
/// </summary>
public abstract class E2ETest
{
    protected IBrowserContext Context = null!;
    protected IPage Page = null!;
    readonly List<string> _pageErrors = new();

    /// <summary>Override to run the test as a phone (390x844, touch).</summary>
    protected virtual bool Phone => false;

    protected static string BaseUrl => Hooks.BaseUrl;

    [SetUp]
    public async Task OpenContext()
    {
        var options = new BrowserNewContextOptions
        {
            ViewportSize = Phone ? new ViewportSize { Width = 390, Height = 844 } : new ViewportSize { Width = 1280, Height = 800 },
            HasTouch = Phone,
            IsMobile = Phone,
            DeviceScaleFactor = Phone ? 2 : 1,
            ReducedMotion = ReducedMotion.Reduce,      // flights and slides finish at once
            ServiceWorkers = ServiceWorkerPolicy.Block, // never serve a stale cached build
            Locale = "en-US",
        };
        Context = await Hooks.Browser.NewContextAsync(options);
        // Fonts, analytics and map tiles live on other hosts; the app must work without them.
        await Context.RouteAsync(
            url => Uri.TryCreate(url, UriKind.Absolute, out var u) && u.Scheme.StartsWith("http") && !u.IsLoopback,
            route => route.AbortAsync());
        Page = await Context.NewPageAsync();
        Page.PageError += (_, message) => { lock (_pageErrors) _pageErrors.Add(message); };
    }

    [TearDown]
    public async Task CloseContext()
    {
        if (Context != null) await Context.CloseAsync();
        string[] errors;
        lock (_pageErrors) errors = _pageErrors.ToArray();
        Assert.That(errors, Is.Empty, "Uncaught page errors:\n" + string.Join("\n", errors));
    }

    // ── Navigation ──────────────────────────────────────────────────────

    /// <summary>Load the app fresh at a hash route ("#/timeline") and wait until the splash is gone.</summary>
    protected async Task Open(string hash = "#/")
    {
        await Page.GotoAsync($"{BaseUrl}/{hash}");
        await WaitUntilReady();
    }

    protected async Task WaitUntilReady()
    {
        await Page.WaitForFunctionAsync("document.documentElement.classList.contains('is-ready')");
        await Assertions.Expect(Page.Locator("#splash")).ToBeHiddenAsync();
    }

    /// <summary>Change the hash inside the running app, as clicking an in-app link would.</summary>
    protected Task NavigateTo(string hash) =>
        Page.EvaluateAsync("h => { window.location.hash = h; }", hash);

    protected Task ExpectHash(string pattern) =>
        Assertions.Expect(Page).ToHaveURLAsync(new Regex("#" + pattern));

    // ── Page data ───────────────────────────────────────────────────────

    protected async Task<T> Eval<T>(string expression) => await Page.EvaluateAsync<T>(expression);

    /// <summary>The visible span of the timeline: its centre year and the number of years on screen.</summary>
    protected async Task<(double Year, double Span)> TimelineView()
    {
        var v = await Eval<JsonElement>("Timeline.getView()");
        return (v.GetProperty("year").GetDouble(), v.GetProperty("span").GetDouble());
    }

    /// <summary>
    /// The years phrase the app shows for a pair ("38 years"), computed by the app's own Store.overlap:
    /// the overlap if their lives overlapped, otherwise the gap between them.
    /// </summary>
    protected Task<string> OverlapPhrase(string slugA, string slugB) => Eval<string>(
        $"(() => {{ const r = Store.overlap(Store.person('{slugA}'), Store.person('{slugB}')); " +
        "return Time.years(r.overlaps ? r.years : r.gap); })()");

    // ── Common locators ─────────────────────────────────────────────────

    protected ILocator PrimaryNav => Page.GetByRole(AriaRole.Navigation, new() { Name = "Primary" });
    protected ILocator TimelineCanvas => Page.GetByRole(AriaRole.Application, new() { Name = "Timeline of people and events" });

    /// <summary>The detail sheet (the only visible complementary landmark carrying a level-1 heading).</summary>
    protected ILocator Sheet => Page.GetByRole(AriaRole.Complementary)
        .Filter(new() { Has = Page.GetByRole(AriaRole.Heading, new() { Level = 1 }) });

    protected ILocator SearchDialog => Page.GetByRole(AriaRole.Dialog, new() { Name = "Search" });
    protected ILocator SearchInput => SearchDialog.GetByRole(AriaRole.Combobox);

    /// <summary>Wait for Leaflet to load and the first place pin to be drawn.</summary>
    protected async Task WaitForMap()
    {
        await Page.WaitForFunctionAsync("typeof L !== 'undefined'");
        await Assertions.Expect(Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex(@", \d+ events?$") }).First)
            .ToBeVisibleAsync();
    }

    /// <summary>Bounding box once it has stopped moving (a slide-in has finished).</summary>
    protected static async Task<LocatorBoundingBoxResult> SettledBox(ILocator locator)
    {
        LocatorBoundingBoxResult? previous = null;
        for (var i = 0; i < 40; i++)
        {
            var box = await locator.BoundingBoxAsync();
            if (box != null && previous != null && Math.Abs(box.Y - previous.Y) < 0.5 && Math.Abs(box.X - previous.X) < 0.5)
                return box;
            previous = box;
            await Task.Delay(100);
        }
        return previous ?? throw new TimeoutException("Element never appeared");
    }
}

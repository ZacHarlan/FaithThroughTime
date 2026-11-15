using Microsoft.Playwright;

// Fixtures (classes) run in parallel; tests inside one class run in order, because each class instance
// holds the per-test Page.
[assembly: Parallelizable(ParallelScope.Fixtures)]
[assembly: LevelOfParallelism(4)]

namespace BibleTimeline.E2E;  // a SetUpFixture applies to its namespace and below: keep it at the root

/// <summary>
/// Launches ONE browser for the whole run; every test gets its own context (see <see cref="E2ETest"/>).
///
/// Configuration (environment variables, all optional):
///   FTT_BASE_URL         App under test. Default http://localhost:5180 (start it first: bash init.sh).
///   FTT_CHROMIUM_PATH    Explicit Chromium / headless-shell executable. Use this when the browser build
///                        the Microsoft.Playwright NuGet package wants is not installed and cannot be
///                        downloaded, e.g. on macOS:
///                        ~/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell
///   FTT_HEADED=1         Show the browser window while debugging.
/// </summary>
[SetUpFixture]
public class Hooks
{
    public static string BaseUrl { get; } =
        (Environment.GetEnvironmentVariable("FTT_BASE_URL") ?? "http://localhost:5180").TrimEnd('/');

    public static IBrowser Browser { get; private set; } = null!;
    static IPlaywright? _playwright;

    [OneTimeSetUp]
    public async Task LaunchBrowser()
    {
        using (var http = new HttpClient { Timeout = TimeSpan.FromSeconds(5) })
        {
            try { (await http.GetAsync(BaseUrl)).EnsureSuccessStatusCode(); }
            catch (Exception e)
            {
                Assert.Fail($"The app is not reachable at {BaseUrl} ({e.Message}). Start it with 'bash init.sh' " +
                            "or set FTT_BASE_URL.");
            }
        }

        Assertions.SetDefaultExpectTimeout(8_000);
        _playwright = await Playwright.CreateAsync();
        Browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = Environment.GetEnvironmentVariable("FTT_HEADED") != "1",
            ExecutablePath = Environment.GetEnvironmentVariable("FTT_CHROMIUM_PATH") is { Length: > 0 } p ? p : null,
        });
    }

    [OneTimeTearDown]
    public async Task CloseBrowser()
    {
        if (Browser != null) await Browser.CloseAsync();
        _playwright?.Dispose();
    }
}

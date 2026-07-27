using Microsoft.Playwright.NUnit;
using Microsoft.Playwright;

namespace BibleTimeline.E2E;

/// <summary>
/// End-to-end Playwright tests for Faith Through Time.
/// Run the app first: cd src/BibleTimeline.Web && dotnet run
/// Then: dotnet test tests/BibleTimeline.E2E
/// Install browsers first: pwsh tests/BibleTimeline.E2E/bin/Debug/net9.0/playwright.ps1 install
/// </summary>
[TestFixture]
public class TimelineE2ETests : PageTest
{
    private const string BaseUrl = "http://localhost:5180";

    [Test]
    public async Task HomePage_LoadsTimeline()
    {
        await Page.GotoAsync(BaseUrl);

        // Title should be present
        await Expect(Page).ToHaveTitleAsync(new System.Text.RegularExpressions.Regex("Faith Through Time"));

        // SVG timeline should render
        var svg = Page.Locator("#timeline-svg");
        await Expect(svg).ToBeVisibleAsync();

        // Time period bands should appear
        var periods = Page.Locator(".period-band");
        await Expect(periods.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Timeline_ShowsPeopleAndEvents()
    {
        await Page.GotoAsync(BaseUrl);

        // Wait for items to render
        var items = Page.Locator(".timeline-item");
        await Expect(items.First).ToBeVisibleAsync();

        // Should have multiple items
        var count = await items.CountAsync();
        Assert.That(count, Is.GreaterThan(10));
    }

    [Test]
    public async Task Search_FindsDavid()
    {
        await Page.GotoAsync(BaseUrl);

        // Type in search
        await Page.FillAsync("#search-input", "David");

        // Wait for search results dropdown
        var dropdown = Page.Locator("#search-results");
        await Expect(dropdown).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Should find David
        var result = Page.Locator(".search-result-item", new() { HasText = "David" });
        await Expect(result.First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Search_ClickResult_OpensDetailPanel()
    {
        await Page.GotoAsync(BaseUrl);

        await Page.FillAsync("#search-input", "Abraham");
        await Page.WaitForSelectorAsync(".search-result-item");

        // Click the result whose name is exactly "Abraham" (not Nahor etc.)
        var abrahamResult = Page.Locator(".search-result-item").Filter(new() { Has = Page.Locator(".result-name", new() { HasTextString = "Abraham" }) });
        await abrahamResult.First.ClickAsync();

        // Detail panel should open
        var detailPanel = Page.Locator("#detail-panel");
        await Expect(detailPanel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Should show "Abraham"
        var title = Page.Locator("#detail-title");
        await Expect(title).ToHaveTextAsync("Abraham");
    }

    [Test]
    public async Task Filters_SignificanceMajor_FiltersItems()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Get initial count
        var initialCount = await Page.Locator(".timeline-item").CountAsync();

        // Click "Major" toggle button in the significance toggle group
        await Page.ClickAsync("#significance-toggle .toggle-btn[data-value='major']");

        // Wait for re-render
        await Page.WaitForTimeoutAsync(500);

        // Count should decrease (not all items are major)
        var majorCount = await Page.Locator(".timeline-item").CountAsync();
        Assert.That(majorCount, Is.LessThan(initialCount));
        Assert.That(majorCount, Is.GreaterThan(0));
    }

    [Test]
    public async Task Filters_UncheckPeople_ShowsOnlyEvents()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Uncheck People
        await Page.UncheckAsync("#filter-people");
        await Page.WaitForTimeoutAsync(500);

        // All visible bars should be events
        var eventItems = Page.Locator(".item-group-event");
        var personItems = Page.Locator(".item-group-person");

        var eventCount = await eventItems.CountAsync();
        var personCount = await personItems.CountAsync();

        Assert.That(eventCount, Is.GreaterThan(0));
        Assert.That(personCount, Is.EqualTo(0));
    }

    [Test]
    public async Task ZoomButtons_Work()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Get initial year display
        var yearDisplay = await Page.Locator("#year-display").TextContentAsync();

        // Click zoom in
        await Page.ClickAsync("#btn-zoom-in");
        await Page.WaitForTimeoutAsync(400);

        // Year display should change (narrower range)
        var zoomedDisplay = await Page.Locator("#year-display").TextContentAsync();
        Assert.That(zoomedDisplay, Is.Not.EqualTo(yearDisplay));
    }

    [Test]
    public async Task DetailPanel_CloseButton_HidesPanel()
    {
        await Page.GotoAsync(BaseUrl);

        // Open detail via search
        await Page.FillAsync("#search-input", "Moses");
        await Page.WaitForSelectorAsync(".search-result-item");
        await Page.Locator(".search-result-item").First.ClickAsync();

        // Panel should be visible
        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Close it
        await Page.ClickAsync("#btn-close-detail");

        // Panel should be hidden
        await Expect(panel).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));
    }

    [Test]
    public async Task FilterByPeriod_ShowsRelevantItems()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Select "Life of Christ" period
        await Page.SelectOptionAsync("#filter-period", "Life of Christ");
        await Page.WaitForTimeoutAsync(500);

        // Should still show items
        var count = await Page.Locator(".timeline-item").CountAsync();
        Assert.That(count, Is.GreaterThan(0));
    }

    [Test]
    public async Task Timeline_DragToPan_ScrollsVertically()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        var container = Page.Locator("#timeline-container");

        // Get initial scroll position
        var initialScroll = await container.EvaluateAsync<double>("el => el.scrollTop");

        // Drag downward: mousedown in center, move down 200px, mouseup
        var box = await container.BoundingBoxAsync();
        Assert.That(box, Is.Not.Null);
        var startX = box!.X + box.Width / 2;
        var startY = box.Y + box.Height / 2;

        await Page.Mouse.MoveAsync(startX, startY);
        await Page.Mouse.DownAsync();
        // Drag upward to scroll down (content moves up)
        await Page.Mouse.MoveAsync(startX, startY - 150, new() { Steps = 10 });
        await Page.Mouse.UpAsync();

        await Page.WaitForTimeoutAsync(100);

        var afterScroll = await container.EvaluateAsync<double>("el => el.scrollTop");
        Assert.That(afterScroll, Is.GreaterThan(initialScroll),
            "Dragging up on the timeline should scroll content down (increase scrollTop)");
    }

    [Test]
    public async Task Timeline_DragToPan_PansHorizontally()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Capture initial year range
        var initialDisplay = await Page.Locator("#year-display").TextContentAsync();

        var container = Page.Locator("#timeline-container");
        var box = await container.BoundingBoxAsync();
        Assert.That(box, Is.Not.Null);
        var startX = box!.X + box.Width / 2;
        var startY = box.Y + box.Height / 2;

        // Drag horizontally
        await Page.Mouse.MoveAsync(startX, startY);
        await Page.Mouse.DownAsync();
        await Page.Mouse.MoveAsync(startX + 300, startY, new() { Steps = 10 });
        await Page.Mouse.UpAsync();

        await Page.WaitForTimeoutAsync(200);

        var afterDisplay = await Page.Locator("#year-display").TextContentAsync();
        Assert.That(afterDisplay, Is.Not.EqualTo(initialDisplay),
            "Dragging horizontally should pan the timeline and change the year display");
    }

    [Test]
    public async Task Timeline_WheelZoom_StillWorks()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        var initialDisplay = await Page.Locator("#year-display").TextContentAsync();

        var container = Page.Locator("#timeline-container");
        var box = await container.BoundingBoxAsync();
        Assert.That(box, Is.Not.Null);

        // Zoom is Ctrl+wheel now (trackpad pinch sends ctrlKey=true);
        // plain wheel pans/scrolls instead of zooming
        await Page.Mouse.MoveAsync(box!.X + box.Width / 2, box.Y + box.Height / 2);
        await Page.Keyboard.DownAsync("Control");
        await Page.Mouse.WheelAsync(0, -300);
        await Page.Keyboard.UpAsync("Control");

        await Page.WaitForTimeoutAsync(300);

        var afterDisplay = await Page.Locator("#year-display").TextContentAsync();
        Assert.That(afterDisplay, Is.Not.EqualTo(initialDisplay),
            "Mouse wheel should still zoom the timeline");
    }

    [Test]
    public async Task Lineage_DragToPan_PansCanvas()
    {
        await Page.GotoAsync(BaseUrl);

        // Switch to family tree tab
        await Page.ClickAsync("[data-tab='lineage']");

        // Wait for autocomplete to be ready, then search for a person with large lineage
        await Page.WaitForSelectorAsync("#lineage-search");
        await Page.FillAsync("#lineage-search", "David");
        await Page.WaitForSelectorAsync("#lineage-suggestions li");
        await Page.Locator("#lineage-suggestions li").First.ClickAsync();

        // Wait for SVG to render
        await Page.WaitForSelectorAsync("#lineage-svg .lineage-node");

        var container = Page.Locator("#lineage-container");

        // Get initial scroll position
        var initialScrollLeft = await container.EvaluateAsync<double>("el => el.scrollLeft");
        var initialScrollTop = await container.EvaluateAsync<double>("el => el.scrollTop");

        var box = await container.BoundingBoxAsync();
        Assert.That(box, Is.Not.Null);
        var startX = box!.X + box.Width / 2;
        var startY = box.Y + box.Height / 2;

        // Drag diagonally
        await Page.Mouse.MoveAsync(startX, startY);
        await Page.Mouse.DownAsync();
        await Page.Mouse.MoveAsync(startX - 100, startY - 100, new() { Steps = 10 });
        await Page.Mouse.UpAsync();

        await Page.WaitForTimeoutAsync(100);

        var afterScrollLeft = await container.EvaluateAsync<double>("el => el.scrollLeft");
        var afterScrollTop = await container.EvaluateAsync<double>("el => el.scrollTop");

        // At least one axis should have moved (depends on content size)
        var moved = (afterScrollLeft != initialScrollLeft) || (afterScrollTop != initialScrollTop);
        Assert.That(moved, Is.True,
            $"Dragging the lineage canvas should pan it. " +
            $"scrollLeft: {initialScrollLeft} -> {afterScrollLeft}, " +
            $"scrollTop: {initialScrollTop} -> {afterScrollTop}");
    }

    // ── Detail Panel Content Tests ───────────────────────────

    [Test]
    public async Task DetailPanel_Person_ShowsScriptureLinksAsClickableAnchors()
    {
        await Page.GotoAsync(BaseUrl);

        // Search for Abraham who has scripture references
        await Page.FillAsync("#search-input", "Abraham");
        await Page.WaitForSelectorAsync(".search-result-item");
        var result = Page.Locator(".search-result-item").Filter(new()
        {
            Has = Page.Locator(".result-name", new() { HasTextString = "Abraham" })
        });
        await result.First.ClickAsync();

        // Detail panel should open
        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Scripture section should exist with accordion toggles
        var scriptureToggles = Page.Locator("#detail-content .scripture-toggle");
        await Expect(scriptureToggles.First).ToBeVisibleAsync();

        // Toggle should be a button
        var tagName = await scriptureToggles.First.EvaluateAsync<string>("el => el.tagName");
        Assert.That(tagName, Is.EqualTo("BUTTON"));

        // Click to expand: passage text loads inline from the local Bible
        // JSON (no external BibleGateway link-outs anymore)
        await scriptureToggles.First.ClickAsync();
        var preview = Page.Locator("#detail-content .scripture-preview").First;
        await Expect(preview).Not.ToContainTextAsync("Loading passage", new() { Timeout = 10000 });
        var text = await preview.TextContentAsync();
        Assert.That(text!.Length, Is.GreaterThan(80), "inline passage text should load");

        var gatewayLinks = await Page.Locator("#detail-content a[href*='biblegateway']").CountAsync();
        Assert.That(gatewayLinks, Is.EqualTo(0), "BibleGateway link-outs were removed");

        // Version picker is present and lists the local translations
        var picker = Page.Locator("#detail-content .bible-version-select");
        await Expect(picker).ToBeVisibleAsync();
        var options = await picker.Locator("option").AllTextContentsAsync();
        Assert.That(options, Does.Contain("KJV"));
    }

    [Test]
    public async Task DetailPanel_Event_ShowsScriptureLinksAsClickableAnchors()
    {
        await Page.GotoAsync(BaseUrl);

        // Search for an event with scripture references
        await Page.FillAsync("#search-input", "Call of Abraham");
        await Page.WaitForSelectorAsync(".search-result-item");
        await Page.Locator(".search-result-item").First.ClickAsync();

        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Scripture accordion toggles should be present
        var scriptureToggles = Page.Locator("#detail-content .scripture-toggle");
        await Expect(scriptureToggles.First).ToBeVisibleAsync();

        // Expand: passage text loads inline from the local Bible JSON, and
        // switching the version picker swaps the translation
        await scriptureToggles.First.ClickAsync();
        var preview = Page.Locator("#detail-content .scripture-preview").First;
        await Expect(preview).Not.ToContainTextAsync("Loading passage", new() { Timeout = 10000 });
        var kjvText = await preview.TextContentAsync();
        Assert.That(kjvText!.Length, Is.GreaterThan(80), "inline passage text should load");

        var picker = Page.Locator("#detail-content .bible-version-select");
        await Expect(picker).ToBeVisibleAsync();
        await picker.SelectOptionAsync("nlt");
        await Page.WaitForTimeoutAsync(1500);
        var nltText = await preview.TextContentAsync();
        Assert.That(nltText, Is.Not.EqualTo(kjvText), "changing version should change the passage text");
        // Reset for other tests (picker choice persists in localStorage)
        await picker.SelectOptionAsync("kjv");
    }

    [Test]
    public async Task DetailPanel_Person_ShowsAllSections()
    {
        await Page.GotoAsync(BaseUrl);

        await Page.FillAsync("#search-input", "Moses");
        await Page.WaitForSelectorAsync(".search-result-item");
        var result = Page.Locator(".search-result-item").Filter(new()
        {
            Has = Page.Locator(".result-name", new() { HasTextString = "Moses" })
        });
        await result.First.ClickAsync();

        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Should have Details, Description, Events, and Relationships sections
        var sections = Page.Locator("#detail-content .detail-section h3");
        var sectionTexts = await sections.AllTextContentsAsync();

        Assert.That(sectionTexts, Does.Contain("Details"));
        Assert.That(sectionTexts, Does.Contain("Description"));
        Assert.That(sectionTexts, Does.Contain("Events"));
        Assert.That(sectionTexts, Does.Contain("Relationships"));
    }

    [Test]
    public async Task DetailPanel_Event_ShowsAllSections()
    {
        await Page.GotoAsync(BaseUrl);

        await Page.FillAsync("#search-input", "Crucifixion");
        await Page.WaitForSelectorAsync(".search-result-item");
        // Click the event result, not a person result
        var eventResult = Page.Locator(".search-result-item").Filter(new()
        {
            Has = Page.Locator(".result-name", new() { HasTextString = "Crucifixion" })
        });
        await eventResult.First.ClickAsync();

        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        var sections = Page.Locator("#detail-content .detail-section h3");
        var sectionTexts = await sections.AllTextContentsAsync();

        Assert.That(sectionTexts, Does.Contain("Details"));
        Assert.That(sectionTexts, Does.Contain("Description"));
        Assert.That(sectionTexts, Does.Contain("People Involved"));
        Assert.That(sectionTexts, Does.Contain("Locations"));
        Assert.That(sectionTexts, Does.Contain("Scripture"));
    }

    [Test]
    public async Task DetailPanel_RelatedEventsAreClickable()
    {
        await Page.GotoAsync(BaseUrl);

        // Open Abraham's detail
        await Page.FillAsync("#search-input", "Abraham");
        await Page.WaitForSelectorAsync(".search-result-item");
        var result = Page.Locator(".search-result-item").Filter(new()
        {
            Has = Page.Locator(".result-name", new() { HasTextString = "Abraham" })
        });
        await result.First.ClickAsync();

        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Click a related event — should navigate detail panel
        var eventItem = Page.Locator("#detail-content li[data-type='event']").First;
        await Expect(eventItem).ToBeVisibleAsync();
        var eventName = (await eventItem.TextContentAsync())?.Trim().Split('—')[0].Trim();
        await eventItem.ClickAsync();

        // Panel should update to show the event
        await Page.WaitForTimeoutAsync(500);
        var title = await Page.Locator("#detail-title").TextContentAsync();
        Assert.That(title, Is.Not.EqualTo("Abraham"),
            "Clicking a related event should change the detail panel title");
    }

    [Test]
    public async Task DetailPanel_MapView_ShowsDetailsOnMarkerClick()
    {
        await Page.GotoAsync(BaseUrl);

        // Switch to map tab
        await Page.ClickAsync("[data-tab='map']");

        // Wait for Leaflet map to initialize and markers to render
        await Page.WaitForSelectorAsync("#map-container");
        await Page.WaitForTimeoutAsync(2000);

        // Leaflet circle markers are SVG paths — click one via JS
        var clicked = await Page.EvaluateAsync<bool>(@"() => {
            const paths = document.querySelectorAll('#map-tab .leaflet-interactive');
            if (paths.length === 0) return false;
            paths[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
        }");
        Assert.That(clicked, Is.True, "Should find at least one Leaflet interactive marker");

        // Wait for API call to complete and detail panel to populate
        await Page.WaitForTimeoutAsync(1000);

        // Detail panel should open with content
        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        var title = await Page.Locator("#detail-title").TextContentAsync();
        Assert.That(title, Is.Not.Empty);
        Assert.That(title, Is.Not.EqualTo("Details"),
            "Detail panel should show the name of the clicked item, not the default title");

        // Content should have at least a Details section
        var sections = Page.Locator("#detail-content .detail-section");
        var count = await sections.CountAsync();
        Assert.That(count, Is.GreaterThan(0), "Detail panel should have content sections");
    }

    [Test]
    public async Task Lineage_DetailPanel_IsScrollable()
    {
        await Page.GotoAsync("http://localhost:5180");
        await Page.WaitForSelectorAsync("#timeline-svg");

        // Switch to lineage tab
        await Page.ClickAsync("[data-tab='lineage']");
        await Page.WaitForTimeoutAsync(500);

        // Search for Abraham (has many relatives)
        await Page.FillAsync("#lineage-search", "Abraham");
        await Page.WaitForSelectorAsync("#lineage-suggestions li");
        await Page.ClickAsync("#lineage-suggestions li:first-child");
        await Page.WaitForTimeoutAsync(1000);

        // Click a non-subject card
        var card = Page.Locator(".lineage-node:not(.subject) .lineage-card").First;
        await card.ClickAsync();
        await Page.WaitForTimeoutAsync(500);

        // Panel should be visible
        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // Check that the detail panel is the top element at its center
        var isOnTop = await Page.EvaluateAsync<bool>(@"() => {
            const panel = document.getElementById('detail-panel');
            const rect = panel.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const el = document.elementFromPoint(cx, cy);
            return panel.contains(el);
        }");
        Assert.That(isOnTop, Is.True, "Detail panel should be the topmost element at its center (z-index stacking)");

        // Check that the panel is scrollable (overflow-y is scroll or auto)
        var overflowY = await panel.EvaluateAsync<string>("el => window.getComputedStyle(el).overflowY");
        Assert.That(overflowY, Is.AnyOf("scroll", "auto"), "Detail panel must have overflow-y: scroll or auto");
    }

    // ─────────────────────────────────────────────────────────
    // Map view: regression coverage for two recurring bugs
    //   1. The dashed polyline that connects journey stops disappears
    //   2. Clicking a marker no longer opens the detail panel
    // These tests pick a person known to have a long, multi-location
    // journey (Paul = id 41, includes Acts shipwreck arc) so a missing
    // polyline is unambiguous: with 40+ stops we expect at least one
    // SVG <path> with no arc commands and ≥10 line segments.
    // ─────────────────────────────────────────────────────────

    private static async Task SelectPaulOnMap(IPage page)
    {
        // Under full-suite load this setup occasionally fails fast (map
        // data fetch racing tab activation); one retry absorbs the flake.
        try
        {
            await SelectPaulOnMapCore(page);
        }
        catch
        {
            await page.WaitForTimeoutAsync(750);
            await SelectPaulOnMapCore(page);
        }
    }

    private static async Task SelectPaulOnMapCore(IPage page)
    {
        await page.GotoAsync(BaseUrl);
        await page.ClickAsync("[data-tab='map']");
        await page.WaitForSelectorAsync("#map-container");
        // Wait for map data to load and Leaflet to lay out the SVG overlay
        await page.WaitForFunctionAsync(
            "() => document.querySelectorAll('#map-person-select option').length > 5",
            null,
            new PageWaitForFunctionOptions { Timeout = 10000 });
        await page.SelectOptionAsync("#map-person-select", "41");
        // Allow the journey fetch + polyline draw to settle
        await page.WaitForFunctionAsync(
            @"() => {
                const overlayPane = document.querySelector('#map-tab .leaflet-overlay-pane');
                if (!overlayPane) return false;
                return overlayPane.querySelectorAll('path').length > 5;
            }",
            null,
            new PageWaitForFunctionOptions { Timeout = 10000 });
    }

    [Test]
    public async Task MapView_PersonJourney_DrawsConnectingPolyline()
    {
        await SelectPaulOnMap(Page);

        // The journey polyline is a single SVG <path> in Leaflet's overlay
        // pane with `fill="none"` and a sequence of L commands and no arc
        // commands. Circle markers, by contrast, use `a` (arc) commands.
        var polylineInfo = await Page.EvaluateAsync<string>(@"() => {
            const overlayPane = document.querySelector('#map-tab .leaflet-overlay-pane');
            if (!overlayPane) return JSON.stringify({error: 'overlay pane missing'});
            const paths = overlayPane.querySelectorAll('path');
            const polylines = [];
            paths.forEach(p => {
                const d = p.getAttribute('d') || '';
                const hasArc = /[Aa]/.test(d);
                const lineSegments = (d.match(/[Ll]/g) || []).length;
                if (!hasArc && lineSegments > 0) {
                    polylines.push({
                        stroke: p.getAttribute('stroke'),
                        strokeWidth: p.getAttribute('stroke-width'),
                        lineSegments,
                        dLen: d.length
                    });
                }
            });
            return JSON.stringify({total: paths.length, polylines});
        }");

        var doc = System.Text.Json.JsonDocument.Parse(polylineInfo);
        var polylines = doc.RootElement.GetProperty("polylines");
        Assert.That(polylines.GetArrayLength(), Is.GreaterThanOrEqualTo(1),
            $"Expected at least one journey polyline connecting Paul's map markers, got: {polylineInfo}");

        // The journey should connect ALL of Paul's stops, so we expect
        // many line segments. A regression that drops half the journey
        // would still leave a polyline; this guards against the polyline
        // shrinking to a stub or being replaced by a 2-point degenerate.
        var segments = polylines[0].GetProperty("lineSegments").GetInt32();
        Assert.That(segments, Is.GreaterThanOrEqualTo(10),
            $"Polyline has too few segments ({segments}); expected ≥10 for Paul's journey. Diag: {polylineInfo}");
    }

    [Test]
    public async Task MapView_ClickMarker_OpensDetailPanel()
    {
        await SelectPaulOnMap(Page);

        // Click the first arc-command path (a circle marker, not the polyline)
        var clicked = await Page.EvaluateAsync<bool>(@"() => {
            const paths = document.querySelectorAll('#map-tab .leaflet-interactive');
            for (const p of paths) {
                const d = p.getAttribute('d') || '';
                if (/[Aa]/.test(d)) {
                    p.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                    return true;
                }
            }
            return false;
        }");
        Assert.That(clicked, Is.True, "Could not find a clickable circle marker on the map");

        var panel = Page.Locator("#detail-panel");
        await Expect(panel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("hidden"));

        // The panel must actually be on-screen, not just lacking the hidden class
        var rect = await panel.BoundingBoxAsync();
        Assert.That(rect, Is.Not.Null, "Detail panel has no bounding box");
        Assert.That(rect!.Width, Is.GreaterThan(0), "Detail panel has zero width");
        Assert.That(rect.Height, Is.GreaterThan(0), "Detail panel has zero height");

        // The title should be populated with the clicked stop's event name,
        // not the default "Details" placeholder.
        var title = await Page.Locator("#detail-title").TextContentAsync();
        Assert.That(title, Is.Not.Null.And.Not.Empty);
        Assert.That(title, Is.Not.EqualTo("Details"),
            "Detail panel title should reflect the clicked marker, not stay at the default");

        // And the body must be populated, not just an empty shell
        var contentLen = await Page.EvaluateAsync<int>(
            "() => document.getElementById('detail-content')?.innerHTML?.length || 0");
        Assert.That(contentLen, Is.GreaterThan(100),
            "Detail panel content should be populated after clicking a map marker");
    }
}

/// <summary>
/// Mobile-specific E2E tests using a 375×667 (iPhone SE) viewport.
/// Verifies responsive layout, filter drawer, and select element rendering.
/// </summary>
[TestFixture]
public class MobileE2ETests : PageTest
{
    private const string BaseUrl = "http://localhost:5180";

    public override BrowserNewContextOptions ContextOptions()
    {
        return new BrowserNewContextOptions
        {
            ViewportSize = new ViewportSize { Width = 375, Height = 667 },
            IsMobile = true,
            HasTouch = true,
            // The app now follows the OS color-scheme preference when the
            // user hasn't chosen a theme; these tests assert the dark UI,
            // so the emulated device must declare a dark preference.
            ColorScheme = ColorScheme.Dark,
            UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        };
    }

    [Test]
    public async Task Mobile_SelectElements_HaveMinimum16pxFontSize()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Open the filter drawer
        await Page.ClickAsync("#btn-mobile-filters");
        await Page.WaitForTimeoutAsync(300);

        // Check all <select> elements inside the filter panel
        var selects = Page.Locator(".filter-section select");
        var selectCount = await selects.CountAsync();
        Assert.That(selectCount, Is.GreaterThan(0), "Should have filter select elements");

        for (int i = 0; i < selectCount; i++)
        {
            var fontSize = await selects.Nth(i).EvaluateAsync<string>(
                "el => window.getComputedStyle(el).fontSize");
            var sizeValue = float.Parse(fontSize.Replace("px", ""));
            Assert.That(sizeValue, Is.GreaterThanOrEqualTo(16f),
                $"Select #{i} has font-size {fontSize}, must be >= 16px to prevent iOS zoom");
        }
    }

    [Test]
    public async Task Mobile_SelectElements_HaveAdequateHeight()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        await Page.ClickAsync("#btn-mobile-filters");
        await Page.WaitForTimeoutAsync(300);

        var selects = Page.Locator(".filter-section select");
        var selectCount = await selects.CountAsync();

        for (int i = 0; i < selectCount; i++)
        {
            var height = await selects.Nth(i).EvaluateAsync<double>(
                "el => el.getBoundingClientRect().height");
            Assert.That(height, Is.GreaterThanOrEqualTo(40),
                $"Select #{i} rendered height is {height}px, must be >= 40px for touch targets");
        }
    }

    [Test]
    public async Task Mobile_SelectOptions_HaveReadableText()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        await Page.ClickAsync("#btn-mobile-filters");
        await Page.WaitForTimeoutAsync(300);

        // Verify the period select has options with text
        var periodSelect = Page.Locator("#filter-period");
        var optionCount = await periodSelect.Locator("option").CountAsync();
        Assert.That(optionCount, Is.GreaterThan(1), "Period select should have options populated");

        // Verify option font-size matches the select's font-size
        var selectFontSize = await periodSelect.EvaluateAsync<string>(
            "el => window.getComputedStyle(el).fontSize");
        var optionFontSize = await periodSelect.Locator("option").First.EvaluateAsync<string>(
            "el => window.getComputedStyle(el).fontSize");
        var selectSize = float.Parse(selectFontSize.Replace("px", ""));
        var optionSize = float.Parse(optionFontSize.Replace("px", ""));
        Assert.That(optionSize, Is.GreaterThanOrEqualTo(selectSize),
            $"Option font-size ({optionFontSize}) should be >= select font-size ({selectFontSize})");
    }

    [Test]
    public async Task Mobile_ColorScheme_IsDark()
    {
        await Page.GotoAsync(BaseUrl);

        // Verify color-scheme meta tag is present
        var metaColorScheme = await Page.EvaluateAsync<string>(
            "() => document.querySelector('meta[name=\"color-scheme\"]')?.content ?? ''");
        Assert.That(metaColorScheme, Is.EqualTo("dark"),
            "color-scheme meta tag should be 'dark' for proper native control rendering");

        // Verify CSS color-scheme property is set
        var cssColorScheme = await Page.EvaluateAsync<string>(
            "() => window.getComputedStyle(document.documentElement).colorScheme");
        Assert.That(cssColorScheme, Does.Contain("dark"),
            "CSS color-scheme should include 'dark'");
    }

    [Test]
    public async Task Mobile_HamburgerButton_IsVisible()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        var hamburger = Page.Locator("#btn-mobile-filters");
        await Expect(hamburger).ToBeVisibleAsync();
    }

    [Test]
    public async Task Mobile_FilterDrawer_OpensAndCloses()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        var filterPanel = Page.Locator("#filter-panel");
        var hamburger = Page.Locator("#btn-mobile-filters");

        // Initially should be off-screen (not have drawer-open class)
        await Expect(filterPanel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("drawer-open"));

        // Verify button is tappable (not covered) — get its bounding box
        var box = await hamburger.BoundingBoxAsync();
        Assert.That(box, Is.Not.Null, "Hamburger button has no bounding box");
        TestContext.Out.WriteLine($"HAMBURGER: x={box!.X} y={box.Y} w={box.Width} h={box.Height}");

        // Use Tap (touch event) instead of Click (mouse event) for real mobile testing
        await hamburger.TapAsync();
        await Page.WaitForTimeoutAsync(400);
        await Expect(filterPanel).ToHaveClassAsync(new System.Text.RegularExpressions.Regex("drawer-open"));

        // Verify drawer is actually visible on screen
        var drawerBox = await filterPanel.BoundingBoxAsync();
        Assert.That(drawerBox, Is.Not.Null, "Drawer opened but has no bounding box");
        Assert.That(drawerBox!.X, Is.GreaterThanOrEqualTo(0), "Drawer should be on-screen (not translated left)");
        TestContext.Out.WriteLine($"DRAWER: x={drawerBox.X} y={drawerBox.Y} w={drawerBox.Width} h={drawerBox.Height}");

        // Close by tapping backdrop
        await Page.EvaluateAsync("() => document.getElementById('mobile-backdrop').click()");
        await Page.WaitForTimeoutAsync(400);
        await Expect(filterPanel).Not.ToHaveClassAsync(new System.Text.RegularExpressions.Regex("drawer-open"));
    }

    [Test]
    public async Task Mobile_FilterPeriodSelect_CanBeInteracted()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Open drawer
        await Page.ClickAsync("#btn-mobile-filters");
        await Page.WaitForTimeoutAsync(300);

        // Select a period
        var periodSelect = Page.Locator("#filter-period");
        await periodSelect.SelectOptionAsync("Life of Christ");

        // Wait for data to reload
        await Page.WaitForTimeoutAsync(500);

        // Should still have items (filter is working, not broken)
        var items = Page.Locator(".timeline-item");
        var itemCount = await items.CountAsync();
        Assert.That(itemCount, Is.GreaterThan(0),
            "Selecting a period filter on mobile should still show results");
    }

    [Test]
    public async Task Mobile_MapTab_BottomNavStaysVisible()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        // Bottom nav should be visible initially
        var nav = Page.Locator(".bottom-nav");
        await Expect(nav).ToBeVisibleAsync();
        var boxBefore = await nav.BoundingBoxAsync();
        Assert.That(boxBefore, Is.Not.Null);
        TestContext.Out.WriteLine($"BEFORE: nav y={boxBefore!.Y} h={boxBefore.Height}");

        // Click map tab
        await Page.ClickAsync(".bottom-nav-btn[data-tab=\"map\"]");
        await Page.WaitForTimeoutAsync(1500);

        // Bottom nav should still be visible and same size
        await Expect(nav).ToBeVisibleAsync();
        var boxAfter = await nav.BoundingBoxAsync();
        Assert.That(boxAfter, Is.Not.Null, "Bottom nav has no bounding box on map tab");
        TestContext.Out.WriteLine($"AFTER:  nav y={boxAfter!.Y} h={boxAfter.Height}");

        // Check computed styles
        var styles = await Page.EvaluateAsync<string>(@"() => {
            const n = document.querySelector('.bottom-nav');
            const cs = getComputedStyle(n);
            return `display=${cs.display} pos=${cs.position} bot=${cs.bottom} z=${cs.zIndex} h=${cs.height}`;
        }");
        TestContext.Out.WriteLine($"NAV STYLES: {styles}");

        var mapStyles = await Page.EvaluateAsync<string>(@"() => {
            const m = document.getElementById('map-tab');
            const cs = getComputedStyle(m);
            return `display=${cs.display} pos=${cs.position} bot=${cs.bottom} z=${cs.zIndex} h=${cs.height}`;
        }");
        TestContext.Out.WriteLine($"MAP STYLES: {mapStyles}");

        // Check if the page is scrolling or viewport is shifting
        var scrollInfo = await Page.EvaluateAsync<string>(@"() => {
            return `htmlScroll=${document.documentElement.scrollTop} bodyScroll=${document.body.scrollTop} visualVP=${window.visualViewport?.offsetTop ?? 'n/a'} innerH=${window.innerHeight} outerH=${window.outerHeight} bodyH=${document.body.offsetHeight} htmlH=${document.documentElement.offsetHeight} docSH=${document.documentElement.scrollHeight}`;
        }");
        TestContext.Out.WriteLine($"SCROLL INFO: {scrollInfo}");

        var transforms = await Page.EvaluateAsync<string>(@"() => {
            let el = document.querySelector('.bottom-nav');
            const results = [];
            while (el) {
                const cs = getComputedStyle(el);
                if (cs.transform !== 'none') results.push(el.tagName + '#' + el.id + '.' + el.className + '=' + cs.transform);
                el = el.parentElement;
            }
            return results.length ? results.join('; ') : 'none';
        }");
        TestContext.Out.WriteLine($"ANCESTOR TRANSFORMS: {transforms}");

        Assert.That(boxAfter.Height, Is.GreaterThanOrEqualTo(55), $"Bottom nav height is {boxAfter.Height}px, expected ≥55");
        Assert.That(boxAfter.Height, Is.EqualTo(boxBefore.Height).Within(2), "Bottom nav height changed after switching to map tab");
    }

    [Test]
    public async Task Mobile_SearchTab_BottomNavStaysVisible()
    {
        await Page.GotoAsync(BaseUrl);
        await Page.WaitForSelectorAsync(".timeline-item");

        var nav = Page.Locator(".bottom-nav");
        await Expect(nav).ToBeVisibleAsync();
        var boxBefore = await nav.BoundingBoxAsync();
        Assert.That(boxBefore, Is.Not.Null);

        // Click search tab
        await Page.ClickAsync(".bottom-nav-btn[data-tab=\"search\"]");
        await Page.WaitForTimeoutAsync(500);

        // Bottom nav should still be visible and same position
        await Expect(nav).ToBeVisibleAsync();
        var boxAfter = await nav.BoundingBoxAsync();
        Assert.That(boxAfter, Is.Not.Null, "Bottom nav has no bounding box on search tab");
        TestContext.Out.WriteLine($"BEFORE: nav y={boxBefore!.Y} h={boxBefore.Height}");
        TestContext.Out.WriteLine($"AFTER:  nav y={boxAfter!.Y} h={boxAfter.Height}");

        Assert.That(boxAfter.Y, Is.EqualTo(boxBefore.Y).Within(2), "Bottom nav moved after switching to search tab");
        Assert.That(boxAfter.Height, Is.GreaterThanOrEqualTo(55));

        // Verify the search overlay does NOT cover the bottom nav area
        var overlayBottom = await Page.EvaluateAsync<double>(@"() => {
            const overlay = document.querySelector('.search-overlay:not(.hidden)');
            if (!overlay) return 0;
            const rect = overlay.getBoundingClientRect();
            return rect.bottom;
        }");
        var navTop = await Page.EvaluateAsync<double>(@"() => {
            const nav = document.querySelector('.bottom-nav');
            return nav.getBoundingClientRect().top;
        }");
        TestContext.Out.WriteLine($"OVERLAY bottom={overlayBottom}, NAV top={navTop}");
        Assert.That(overlayBottom, Is.LessThanOrEqualTo(navTop + 2),
            $"Search overlay (bottom={overlayBottom}) must not cover bottom nav (top={navTop})");

        // Verify bottom nav buttons are actually clickable (not covered)
        var timelineBtn = Page.Locator(".bottom-nav-btn[data-tab=\"timeline\"]");
        await timelineBtn.ClickAsync(new() { Timeout = 3000 });
        await Page.WaitForTimeoutAsync(300);

        // Should have switched back to timeline tab
        var isTimelineVisible = await Page.EvaluateAsync<bool>(
            "() => document.getElementById('app').style.display !== 'none'");
        Assert.That(isTimelineVisible, Is.True,
            "Clicking timeline button in bottom nav while search is open should switch tabs");
    }
}

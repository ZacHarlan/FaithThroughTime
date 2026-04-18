using Microsoft.Playwright.NUnit;
using Microsoft.Playwright;

namespace BibleTimeline.E2E;

/// <summary>
/// End-to-end Playwright tests for Bible Timeline.
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
        await Expect(Page).ToHaveTitleAsync(new System.Text.RegularExpressions.Regex("Bible Timeline"));

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

        // Wheel zoom in
        await Page.Mouse.MoveAsync(box!.X + box.Width / 2, box.Y + box.Height / 2);
        await Page.Mouse.WheelAsync(0, -300);

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

        // Scripture section should exist with clickable <a> tags
        var scriptureLinks = Page.Locator("#detail-content .scripture-link");
        await Expect(scriptureLinks.First).ToBeVisibleAsync();

        // Links should be actual <a> elements with href
        var tagName = await scriptureLinks.First.EvaluateAsync<string>("el => el.tagName");
        Assert.That(tagName, Is.EqualTo("A"));

        var href = await scriptureLinks.First.GetAttributeAsync("href");
        Assert.That(href, Does.Contain("biblegateway.com"));
        Assert.That(href, Does.Contain("version=ESV"));

        // Should open in new tab
        var target = await scriptureLinks.First.GetAttributeAsync("target");
        Assert.That(target, Is.EqualTo("_blank"));
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

        // Scripture links should be present and be <a> tags
        var scriptureLinks = Page.Locator("#detail-content .scripture-link");
        await Expect(scriptureLinks.First).ToBeVisibleAsync();

        var href = await scriptureLinks.First.GetAttributeAsync("href");
        Assert.That(href, Does.Contain("biblegateway.com"));
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
}

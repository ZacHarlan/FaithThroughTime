using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class ParallelTests : E2ETest
{
    [Test]
    public async Task Index_lists_the_three_groups_and_filters()
    {
        await Open("#/parallel");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2, Name = "The Gospels side by side" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2, Name = "Samuel–Kings and Chronicles" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2, Name = "Other parallel passages" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Feeding the five thousand" })).ToBeVisibleAsync();

        await Page.GetByLabel("Search parallel passages").FillAsync("Uzziah");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Uzziah king of Judah" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Feeding the five thousand" })).ToBeHiddenAsync();
    }

    [Test]
    public async Task Feeding_the_five_thousand_shows_four_columns_with_text()
    {
        await Open("#/parallel/feeding-the-five-thousand");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Feeding the five thousand");
        var cols = Page.Locator(".par-col");
        await Expect(cols).ToHaveCountAsync(4);
        await Expect(cols.Nth(0)).ToContainTextAsync("five loaves");
        await Expect(cols.Nth(3)).ToContainTextAsync("five barley loaves");
        await Expect(cols.Nth(3).Locator(".par-vn").First).ToHaveTextAsync("1");
        var tops = await Page.Locator(".par-colhead").EvaluateAllAsync<double[]>("els => els.map(e => Math.round(e.getBoundingClientRect().top))");
        Assert.That(tops.Distinct().Count(), Is.EqualTo(1), "column tops are aligned");
        // The heading links to the reader.
        await Expect(cols.Nth(1).GetByRole(AriaRole.Link, new() { Name = "Mark 6:30–44" })).ToHaveAttributeAsync("href", new Regex("#/read/mark/6"));

        // Switching translation reloads the text; the KJV says "loaves" too but reads differently.
        await Page.GetByRole(AriaRole.Button, new() { Name = "KJV" }).ClickAsync();
        await Expect(cols.Nth(0)).ToContainTextAsync("departed thence");
        await Page.GetByRole(AriaRole.Button, new() { Name = "ESV" }).ClickAsync();
    }

    [Test]
    public async Task A_Kings_and_Chronicles_pair_sits_side_by_side()
    {
        await Open("#/parallel/uzziah-king-of-judah");
        var cols = Page.Locator(".par-col");
        // 2 Chronicles 26, and 2 Kings 14:21-22 + 15:1-7 (Jeroboam II's reign falls between them).
        await Expect(cols).ToHaveCountAsync(3);
        await Expect(cols.Nth(0)).ToContainTextAsync("Uzziah");
        await Expect(cols.Nth(1)).ToContainTextAsync("Azariah");
        await Expect(Page.Locator("a[aria-label^='Next section']")).ToBeVisibleAsync();
    }

    [Test]
    public async Task Reader_rail_for_2_Kings_19_links_to_the_Isaiah_parallel()
    {
        await Open("#/read/2-kings/19");
        var link = Page.GetByRole(AriaRole.Link, new() { Name = "Sennacherib invades Judah" });
        await Expect(link).ToBeVisibleAsync();
        await link.ClickAsync();
        await ExpectHash("/parallel/sennacherib-invades-judah");
        await Expect(Page.Locator(".par-col")).ToHaveCountAsync(3);
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Isaiah 36:1–37:38" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task Verse_study_panel_lists_the_other_passages()
    {
        await Open("#/read/mark/6?study=41");
        // Inside the study panel (the reader rail has its own "Parallel accounts" group, folded while studying).
        var panel = Page.Locator("#study-panel");
        await Expect(panel.GetByText("Parallel accounts").First).ToBeVisibleAsync();
        await Expect(panel.GetByRole(AriaRole.Link, new() { Name = "John 6:1–15" }).First).ToBeVisibleAsync();
    }
}

public class ParallelPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Columns_become_tabs_on_a_phone()
    {
        await Open("#/parallel/feeding-the-five-thousand");
        var tabs = Page.Locator(".par-tab");
        await Expect(tabs).ToHaveCountAsync(4);
        await Expect(Page.Locator(".par-col.is-active")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".par-col.is-active")).ToContainTextAsync("five loaves");
        Assert.That(await Page.Locator(".par-col:not(.is-active)").First.IsVisibleAsync(), Is.False);

        await tabs.Nth(3).TapAsync();
        await Expect(Page.Locator(".par-col.is-active")).ToContainTextAsync("five barley loaves");
        await Expect(tabs.Nth(3)).ToHaveAttributeAsync("aria-pressed", "true");
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), Is.True, "no sideways scroll at 390px");
        var box = await tabs.Nth(3).BoundingBoxAsync();
        Assert.That(box!.Height, Is.GreaterThanOrEqualTo(43));
    }

    [Test]
    public async Task Index_fits_a_phone()
    {
        await Open("#/parallel");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "The Lord's Prayer" })).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), Is.True);
    }
}

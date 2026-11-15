using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class PhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Bottom_tab_bar_is_visible_and_routes()
    {
        await Open("#/");
        await Expect(PrimaryNav).ToBeVisibleAsync();      // only the tab bar is visible at this width
        var box = await PrimaryNav.BoundingBoxAsync();
        Assert.That(box!.Y + box.Height, Is.GreaterThan(844 - 2), "the tab bar sits at the bottom of the screen");

        await PrimaryNav.GetByRole(AriaRole.Link, new() { Name = "Map" }).TapAsync();
        await ExpectHash("/map");
        await Expect(PrimaryNav.GetByRole(AriaRole.Link, new() { Name = "Map" })).ToHaveAttributeAsync("aria-current", "page");
    }

    [Test]
    public async Task Detail_sheet_opens_as_a_bottom_sheet()
    {
        await Open("#/timeline");
        await NavigateTo("#/person/david");
        await Expect(Sheet).ToBeVisibleAsync();
        var box = await SettledBox(Sheet);
        Assert.That(box.Y, Is.GreaterThan(100), "a bottom sheet leaves the view beneath it showing above");
        Assert.That(box.Y, Is.LessThan(844 - 100), "and is actually on screen");
        Assert.That(box.Width, Is.GreaterThan(380), "and spans the width of the screen");
    }
}

public class AccessibilitySmokeTests : E2ETest
{
    // Every focusable control that a simple DOM query finds must have an accessible name.
    const string UnnamedControls = @"() => {
        const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const name = el => {
            const labelled = (el.getAttribute('aria-labelledby') || '').split(/\s+/)
                .map(id => document.getElementById(id)?.textContent || '').join(' ');
            return (el.getAttribute('aria-label') || labelled || el.textContent || el.getAttribute('title')
                || el.getAttribute('alt') || el.querySelector('img[alt]')?.getAttribute('alt') || '').trim();
        };
        return [...document.querySelectorAll('button, a[href]')]
            .filter(visible).filter(el => !name(el))
            .map(el => el.outerHTML.slice(0, 140));
    }";

    const string DuplicateIds = @"() => {
        const seen = new Map();
        for (const el of document.querySelectorAll('[id]')) seen.set(el.id, (seen.get(el.id) || 0) + 1);
        return [...seen].filter(([, n]) => n > 1).map(([id, n]) => id + ' x' + n);
    }";

    [TestCase("#/")]
    [TestCase("#/timeline")]
    [TestCase("#/story/the-whole-story/1")]
    [TestCase("#/meet/noah/abraham")]
    [TestCase("#/family")]
    [TestCase("#/family/jacob")]
    [TestCase("#/map")]
    [TestCase("#/read")]
    [TestCase("#/read/john/3")]
    [TestCase("#/about")]
    public async Task View_has_one_main_named_controls_and_unique_ids(string hash)
    {
        await Open(hash);
        if (hash.StartsWith("#/map")) await WaitForMap();
        if (hash == "#/timeline") await Expect(TimelineCanvas).ToBeVisibleAsync();
        if (hash.StartsWith("#/read/")) await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();

        await Expect(Page.GetByRole(AriaRole.Main)).ToHaveCountAsync(1);
        Assert.That(await Page.EvaluateAsync<string[]>(UnnamedControls), Is.Empty, "buttons or links without an accessible name");
        Assert.That(await Page.EvaluateAsync<string[]>(DuplicateIds), Is.Empty, "duplicate element ids");
    }
}

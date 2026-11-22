using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class DetailDepthTests : E2ETest
{
    ILocator Deeper => Sheet.Locator("section.ds-deeper");

    [Test]
    public async Task Hezekiah_links_to_the_kings_chart_and_a_parallel_account()
    {
        await Open("#/person/hezekiah");
        await Expect(Deeper).ToBeVisibleAsync();
        var kings = Deeper.Locator("a[href^='#/kings?sel=hezekiah']");
        await Expect(kings).ToContainTextAsync("among the kings and prophets");
        await Expect(Deeper.Locator("a[href^='#/parallel/']").First).ToBeVisibleAsync();
        await kings.ClickAsync();
        await ExpectHash("/kings");
    }

    [Test]
    public async Task Abraham_lists_his_journey()
    {
        await Open("#/person/abraham");
        await Expect(Deeper).ToBeVisibleAsync();
        var journey = Deeper.Locator("a[href^='#/map/']").First;
        await Expect(journey).ToBeVisibleAsync();
        await journey.ClickAsync();
        await ExpectHash("/map/");
    }

    [Test]
    public async Task Event_links_to_its_parallel_account()
    {
        await Open("#/event/feeding-of-the-5-000");
        await Expect(Deeper.Locator("a[href^='#/parallel/']").First).ToBeVisibleAsync();
        await Expect(Sheet.Locator("a[href^='#/book/']").First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Places_link_to_their_pages_and_keep_the_map_link()
    {
        await Open("#/");
        var slug = await Eval<string>("Store.events.find(e => Store.locationsOf(e).every(l => l.lat != null) && Store.locationsOf(e).length > 0).slug");
        await NavigateTo($"#/event/{slug}");
        var place = Sheet.Locator("a.ds-place-link").First;
        await Expect(place).ToHaveAttributeAsync("href", new Regex("^#/place/"));
        await Expect(Sheet.Locator(".ds-place-map").First).ToBeVisibleAsync();
    }
}

public class DetailDepthPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Phone_sheet_shows_go_deeper_and_stays_usable()
    {
        await Open("#/timeline");
        await NavigateTo("#/person/hezekiah");
        await Expect(Sheet).ToBeVisibleAsync();
        var deeper = Sheet.Locator("section.ds-deeper");
        await Expect(deeper).ToBeAttachedAsync();
        await deeper.ScrollIntoViewIfNeededAsync();
        await Expect(deeper.Locator("a[href^='#/kings?sel=hezekiah']")).ToBeVisibleAsync();
        await Expect(Sheet.GetByRole(AriaRole.Button, new() { Name = "Close details" })).ToBeVisibleAsync();
    }
}

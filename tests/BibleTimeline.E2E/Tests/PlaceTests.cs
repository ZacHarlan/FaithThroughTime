using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class PlaceTests : E2ETest
{
    [Test]
    public async Task Bethel_shows_events_a_journey_and_verses_that_link_to_the_reader()
    {
        await Open("#/place/bethel");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Bethel");
        await Expect(Page).ToHaveTitleAsync(new Regex("^Bethel"));
        await Expect(Page.Locator("p.place-modern")).ToContainTextAsync("Beitin");

        var events = Page.GetByRole(AriaRole.Region, new() { Name = "What happened here" });
        await Expect(events.Locator("a.place-event").First).ToBeVisibleAsync();
        Assert.That(await events.Locator("a.place-event").CountAsync(), Is.GreaterThan(1));

        var journeys = Page.GetByRole(AriaRole.Region, new() { Name = "Journeys through here" });
        await Expect(journeys.Locator("a[href^='#/map/']").First).ToBeVisibleAsync();

        var scripture = Page.GetByRole(AriaRole.Region, new() { Name = "In Scripture" });
        await Expect(scripture).ToContainTextAsync("verses name Bethel");
        await Expect(scripture.Locator("li.place-verse")).ToHaveCountAsync(30);
        await Expect(scripture.Locator("li.place-verse").First).ToContainTextAsync("Genesis 12:8");
        await Expect(scripture.Locator("p.place-vtext").First).Not.ToBeEmptyAsync();

        await scripture.Locator("button.place-more").ClickAsync();
        await Expect(scripture.Locator("li.place-verse")).ToHaveCountAsync(58);

        await scripture.Locator("a.place-ref").First.ClickAsync();
        await ExpectHash("/read/genesis/12");
    }

    [Test]
    public async Task Map_button_goes_to_the_map_card()
    {
        await Open("#/place/bethel");
        await Page.GetByRole(AriaRole.Link, new() { Name = "See it on the map" }).ClickAsync();
        await ExpectHash("/map\\?place=bethel");
    }

    [Test]
    public async Task Index_lists_places_by_region_and_filters()
    {
        await Open("#/place");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("Every place");
        await Expect(Page).ToHaveTitleAsync(new Regex("^Places"));
        Assert.That(await Page.Locator("a.place-card").CountAsync(), Is.EqualTo(208), "every location is listed");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Galilee", Exact = false }).First).ToBeVisibleAsync();

        await Page.GetByLabel("Find a place").FillAsync("bethl");
        var shown = Page.Locator("a.place-card:visible");
        Assert.That(await shown.CountAsync(), Is.InRange(1, 3), "the filter narrows the list");
        await shown.First.WaitForAsync();
        await Page.Locator("a.place-card[href='#/place/bethlehem']").ClickAsync();
        await ExpectHash("/place/bethlehem");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Bethlehem");
    }

    [Test]
    public async Task Map_place_card_links_to_the_page()
    {
        await Open("#/");
        await NavigateTo("#/map?place=bethel");
        await WaitForMap();
        var link = Page.GetByRole(AriaRole.Link, new() { Name = "Open the page for Bethel" });
        await Expect(link).ToBeVisibleAsync();
        await link.ClickAsync();
        await ExpectHash("/place/bethel");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Bethel");
    }

    [Test]
    public async Task Unknown_place_shows_a_not_found_state()
    {
        await Open("#/place/atlantis");
        await Expect(Page.GetByRole(AriaRole.Alert)).ToContainTextAsync("We could not find that place");
        await Page.GetByRole(AriaRole.Link, new() { Name = "Browse all places" }).ClickAsync();
        await ExpectHash("/place$");
    }

    [Test]
    public async Task A_place_without_a_verse_list_has_no_scripture_section()
    {
        await Open("#/place/red-sea-crossing");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Red Sea Crossing");
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "In Scripture" })).ToHaveCountAsync(0);
    }
}

public class PlacePhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Place_page_fits_a_phone()
    {
        await Open("#/place/bethel");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Bethel");
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "In Scripture" }).Locator("li.place-verse").First).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), Is.True, "no sideways scroll at 390px");

        await Open("#/place");
        await Expect(Page.GetByLabel("Find a place")).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), Is.True, "index fits at 390px");
    }
}

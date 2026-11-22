using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class GuideTests : E2ETest
{
    [Test]
    public async Task Index_lists_the_three_guides()
    {
        await Open("#/guide");
        await Expect(Page).ToHaveTitleAsync(new Regex("Reference guides"));
        var cards = Page.Locator("a.gd-card");
        await Expect(cards).ToHaveCountAsync(3);
        await Expect(cards.Nth(0)).ToContainTextAsync("The covenants");
        await Expect(cards.Nth(1)).ToContainTextAsync("The feasts of Israel");
        await Expect(cards.Nth(2)).ToContainTextAsync("The tabernacle");
        await cards.Nth(0).ClickAsync();
        await ExpectHash("/guide/covenants");
    }

    [Test]
    public async Task Covenants_page_shows_Abrahams_with_a_working_Genesis_link()
    {
        await Open("#/guide/covenants");
        await Expect(Page).ToHaveTitleAsync(new Regex("^The covenants"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("The covenants");
        var abraham = Page.Locator("#gd-abraham");
        await Expect(abraham.GetByRole(AriaRole.Heading, new() { Level = 2 })).ToHaveTextAsync("The covenant with Abraham");
        await Expect(abraham.Locator("a.gd-year")).ToHaveAttributeAsync("href", new Regex("timeline\\?y=-1912"));
        await Expect(abraham).ToContainTextAsync("Later in Scripture");
        await abraham.Locator(".gd-preview").First.ScrollIntoViewIfNeededAsync();
        await Expect(abraham.Locator(".gd-preview").First).ToContainTextAsync(new Regex("."), new() { Timeout = 10000 });
        await abraham.GetByRole(AriaRole.Link, new() { Name = "Genesis 15:1–21" }).First.ClickAsync();
        await ExpectHash("/read/genesis/15");
    }

    [Test]
    public async Task An_item_parameter_scrolls_to_and_marks_that_item()
    {
        await Open("#/guide/covenants?item=new-covenant");
        var item = Page.Locator("#gd-new-covenant");
        await Expect(item).ToHaveClassAsync(new Regex("is-selected"));
        await Expect(item).ToBeInViewportAsync();
        await Expect(item).ToContainTextAsync("Jeremiah 31:33");
    }

    [Test]
    public async Task Feasts_strip_places_Passover_in_the_first_month()
    {
        await Open("#/guide/feasts");
        var first = Page.Locator(".gd-month[data-month='1']");
        await Expect(first).ToContainTextAsync("Passover");
        await Expect(Page.Locator(".gd-month[data-month='7']")).ToContainTextAsync("Atonement");
        await Expect(Page.Locator(".gd-month[data-month='12']")).ToContainTextAsync("Purim");
        await Expect(Page.Locator(".gd-month[data-month='12']")).ToContainTextAsync("later");
        await first.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^Passover") }).ClickAsync();
        await Expect(Page.Locator("#gd-passover")).ToHaveClassAsync(new Regex("is-selected"));
        await Expect(Page.Locator("#gd-passover")).ToContainTextAsync("fourteenth day of the first month");
    }

    [Test]
    public async Task Tabernacle_plan_selects_the_ark()
    {
        await Open("#/guide/tabernacle");
        var ark = Page.Locator("svg.gd-plan [data-part='ark']");
        await Expect(ark).ToHaveAttributeAsync("aria-pressed", "false");
        await ark.ClickAsync();
        await Expect(ark).ToHaveAttributeAsync("aria-pressed", "true");
        var section = Page.Locator("#gd-ark");
        await Expect(section).ToHaveClassAsync(new Regex("is-selected"));
        await Expect(section).ToContainTextAsync("two cubits and a half".Replace("two cubits and a half", "Two cubits and a half"));
        await ExpectHash("/guide/tabernacle\\?item=ark");

        var veil = Page.Locator("svg.gd-plan [data-part='veil']");
        await veil.FocusAsync();
        await Page.Keyboard.PressAsync("Enter");
        await Expect(veil).ToHaveAttributeAsync("aria-pressed", "true");
        await Expect(ark).ToHaveAttributeAsync("aria-pressed", "false");
    }

    [Test]
    public async Task Unknown_guide_is_not_found()
    {
        await Open("#/guide/nothing-here");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("We could not find that guide");
        await Page.GetByRole(AriaRole.Link, new() { Name = "All guides" }).ClickAsync();
        await ExpectHash("/guide$");
        await Expect(Page.Locator("a.gd-card")).ToHaveCountAsync(3);
    }
}

public class GuidePhoneTests : E2ETest
{
    protected override bool Phone => true;

    const string Overflow = "() => document.documentElement.scrollWidth - document.documentElement.clientWidth";

    [Test]
    public async Task Guides_fit_a_phone()
    {
        await Open("#/guide");
        await Expect(Page.Locator("a.gd-card").First).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the index does not scroll sideways");

        await NavigateTo("#/guide/feasts");
        await Expect(Page.Locator(".gd-month[data-month='1']")).ToContainTextAsync("Passover");
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the year strip does not scroll sideways");
        var a = await Page.Locator(".gd-month[data-month='1']").BoundingBoxAsync();
        var b = await Page.Locator(".gd-month[data-month='2']").BoundingBoxAsync();
        Assert.That(b!.Y, Is.GreaterThan(a!.Y), "the months stack on a phone");

        await NavigateTo("#/guide/tabernacle");
        var plan = Page.Locator("svg.gd-plan");
        await Expect(plan).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the plan does not scroll sideways");
        await Page.Locator(".gd-leg-btn", new() { HasText = "The altar of burnt offering" }).ClickAsync();
        await Expect(Page.Locator("#gd-altar")).ToHaveClassAsync(new Regex("is-selected"));
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "an item does not scroll sideways");

        await NavigateTo("#/guide/covenants");
        await Expect(Page.Locator("#gd-noah")).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the covenants do not scroll sideways");
    }
}

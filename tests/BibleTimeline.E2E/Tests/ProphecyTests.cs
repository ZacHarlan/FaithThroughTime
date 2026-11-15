using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class ProphecyTests : E2ETest
{
    [Test]
    public async Task Index_lists_Born_in_Bethlehem_and_filters_by_theme()
    {
        await Open("#/prophecy");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("fulfilment");
        await Expect(Page).ToHaveTitleAsync(new Regex("Prophecy fulfilled"));
        var card = Page.Locator("a.pr-card", new() { HasText = "Born in Bethlehem" });
        await Expect(card).ToBeVisibleAsync();
        await Expect(card).ToContainTextAsync("Micah 5:2");

        await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Kings and prophets") }).ClickAsync();
        await Expect(card).ToHaveCountAsync(0);
        await Expect(Page.Locator("a.pr-card", new() { HasText = "Josiah" }).First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Born_in_Bethlehem_shows_both_passages_side_by_side()
    {
        await Open("#/prophecy");
        await Page.Locator("a.pr-card", new() { HasText = "Born in Bethlehem" }).ClickAsync();
        await ExpectHash("/prophecy/born-in-bethlehem");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Born in Bethlehem");
        var prophecy = Page.GetByRole(AriaRole.Region, new() { Name = "The prophecy" });
        var fulfilment = Page.GetByRole(AriaRole.Region, new() { Name = "The fulfilment" });
        await Expect(prophecy.GetByRole(AriaRole.Heading, new() { Name = "Micah 5:2" })).ToBeVisibleAsync();
        await Expect(prophecy).ToContainTextAsync(new Regex("Ephrat"));
        await Expect(fulfilment).ToContainTextAsync("Herod");
        await Expect(fulfilment.GetByRole(AriaRole.Heading, new() { NameRegex = new Regex("^Matthew 2:1") })).ToBeVisibleAsync();

        var a = await prophecy.BoundingBoxAsync();
        var b = await fulfilment.BoundingBoxAsync();
        Assert.That(b!.X, Is.GreaterThan(a!.X + a.Width - 2), "the passages sit side by side on a wide screen");

        await prophecy.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("Read Micah 5:2 in context") }).ClickAsync();
        await ExpectHash("/read/micah/5");
    }

    [Test]
    public async Task Quotation_list_filters_to_a_book()
    {
        await Open("#/prophecy?tab=quotes");
        var rows = Page.Locator(".pr-q");
        Assert.That(await rows.CountAsync(), Is.GreaterThan(200), "the whole New Testament list is shown");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { NameRegex = new Regex("^Matthew") })).ToBeVisibleAsync();

        await Page.GetByLabel("Filter by New Testament book").SelectOptionAsync(new SelectOptionValue { Value = "hebrews" });
        await Expect(Page.GetByRole(AriaRole.Heading, new() { NameRegex = new Regex("^Matthew") })).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Heading, new() { NameRegex = new Regex("^Hebrews") })).ToBeVisibleAsync();
        Assert.That(await rows.CountAsync(), Is.InRange(20, 80));
        await Expect(rows.First).ToContainTextAsync("Hebrews 1:5");
        await Expect(rows.First).ToContainTextAsync("Psalms 2:7");

        await Page.GetByLabel("Filter by New Testament book").SelectOptionAsync(new SelectOptionValue { Value = "" });
        await Page.GetByLabel("Find a quotation by reference or words").FillAsync("Isaiah 53");
        await Expect(Page.Locator(".pr-q", new() { HasText = "Matthew 8:17" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".pr-q", new() { HasText = "Matthew 4:4" })).ToHaveCountAsync(0);
    }

    [Test]
    public async Task Quotation_link_goes_to_the_reader()
    {
        await Open("#/prophecy?tab=quotes&book=matthew");
        await Page.Locator(".pr-q", new() { HasText = "Matthew 2:6" }).GetByRole(AriaRole.Link, new() { Name = "Micah 5:2" }).ClickAsync();
        await ExpectHash("/read/micah/5");
        await Expect(Page.Locator(".verse[data-v='2']")).ToBeVisibleAsync();
    }

    [Test]
    public async Task Unknown_prophecy_says_so()
    {
        await Open("#/prophecy/no-such-prophecy");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("We could not find that prophecy");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "All prophecies" })).ToBeVisibleAsync();
    }
}

public class ProphecyPhoneTests : E2ETest
{
    protected override bool Phone => true;

    const string Overflow = "() => document.documentElement.scrollWidth - document.documentElement.clientWidth";

    [Test]
    public async Task Index_one_prophecy_and_quotations_fit_a_phone()
    {
        await Open("#/prophecy");
        await Expect(Page.Locator("a.pr-card", new() { HasText = "Born in Bethlehem" })).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the index does not scroll sideways");

        await NavigateTo("#/prophecy/born-in-bethlehem");
        var prophecy = Page.GetByRole(AriaRole.Region, new() { Name = "The prophecy" });
        var fulfilment = Page.GetByRole(AriaRole.Region, new() { Name = "The fulfilment" });
        await Expect(prophecy).ToContainTextAsync(new Regex("Ephrat"));
        await Expect(fulfilment).ToContainTextAsync("Herod");
        var a = await prophecy.BoundingBoxAsync();
        var b = await fulfilment.BoundingBoxAsync();
        Assert.That(b!.Y, Is.GreaterThan(a!.Y + a.Height - 2), "the passages stack on a phone");
        Assert.That(a.Width, Is.GreaterThan(330));
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the passages do not scroll sideways");

        await NavigateTo("#/prophecy?tab=quotes");
        await Expect(Page.Locator(".pr-q").First).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the list does not scroll sideways");
    }
}

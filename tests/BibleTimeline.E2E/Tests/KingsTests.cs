using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class KingsTests : E2ETest
{
    ILocator Chart => Page.Locator(".kings-chart");
    ILocator King(string name) => Page.Locator($".kings-king[data-slug='{name}']");

    [Test]
    public async Task Chart_shows_both_kingdoms_the_prophets_and_a_legend()
    {
        await Open("#/kings");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("Who reigned");
        await Expect(Chart).ToBeVisibleAsync();
        await Expect(Chart.Locator(".kings-gutter-label")).ToHaveTextAsync(new[] { "Judah", "Prophets", "Israel" });
        Assert.That(await Page.Locator(".kings-king").CountAsync(), Is.GreaterThanOrEqualTo(40));
        await Expect(King("david")).ToBeAttachedAsync();
        await Expect(King("jeroboam")).ToBeAttachedAsync();
        await Expect(King("zedekiah")).ToBeAttachedAsync();
        await Expect(King("hoshea")).ToBeAttachedAsync();
        await Expect(Page.Locator(".kings-prophet[data-slug='isaiah']")).ToBeAttachedAsync();
        await Expect(Page.Locator(".kings-legend")).ToContainTextAsync("Did evil");
        await Expect(Page.Locator(".kings-event", new() { HasText = "Samaria falls" })).ToBeAttachedAsync();
    }

    [Test]
    public async Task Selecting_Hezekiah_shows_his_card_with_Isaiah_and_a_working_reader_link()
    {
        await Open("#/kings");
        await King("hezekiah").ScrollIntoViewIfNeededAsync();
        await King("hezekiah").ClickAsync();
        var card = Page.Locator(".kings-card");
        await Expect(card.GetByRole(AriaRole.Heading, new() { Name = "Hezekiah" })).ToBeVisibleAsync();
        await Expect(card).ToContainTextAsync("29 years");
        await Expect(card).ToContainTextAsync("726–698 BC");
        await Expect(card).ToContainTextAsync("third year of Hoshea");
        await Expect(card.Locator(".kings-related")).ToContainTextAsync("Isaiah");
        await Expect(King("hezekiah")).ToHaveAttributeAsync("aria-pressed", "true");
        await Expect(Page.Locator(".kings-prophet[data-slug='isaiah']")).ToHaveClassAsync(new Regex(@"\bis-rel\b"));

        await card.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Read 2 Kings") }).ClickAsync();
        await ExpectHash("/read/2-kings/18");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^2 Kings\s*18$"));
    }

    [Test]
    public async Task Selecting_a_prophet_lists_the_kings_he_served_and_the_person_link_opens_the_sheet()
    {
        await Open("#/kings?sel=isaiah");
        var card = Page.Locator(".kings-card");
        await Expect(card.GetByRole(AriaRole.Heading, new() { Name = "Isaiah" })).ToBeVisibleAsync();
        await Expect(card.Locator(".kings-related")).ToContainTextAsync("Hezekiah");
        await Expect(card.Locator(".kings-related")).ToContainTextAsync("Uzziah");
        await card.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^About") }).ClickAsync();
        await ExpectHash("/person/isaiah");
    }

    [Test]
    public async Task Arrow_keys_move_between_reigns()
    {
        await Open("#/kings");
        await King("saul").FocusAsync();
        await Page.Keyboard.PressAsync("ArrowRight");
        await Expect(King("david")).ToBeFocusedAsync();
        await Page.Keyboard.PressAsync("Enter");
        await Expect(Page.Locator(".kings-card")).ToContainTextAsync("David");
    }

    [Test]
    public async Task List_view_tabulates_kings_by_kingdom()
    {
        await Open("#/kings");
        await Page.GetByRole(AriaRole.Button, new() { Name = "List" }).ClickAsync();
        await Expect(Chart).ToBeHiddenAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Kings of Judah" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Kings of Israel" })).ToBeVisibleAsync();
        var row = Page.Locator("tr[data-slug='hezekiah']");
        await Expect(row).ToContainTextAsync("726–698 BC");
        await Expect(row).ToContainTextAsync("29 years");
        await Expect(row).ToContainTextAsync("Isaiah");
        await Expect(Page.Locator("tr[data-slug='ahab']")).ToContainTextAsync("Evil");
        await row.GetByRole(AriaRole.Button, new() { Name = "Isaiah" }).ClickAsync();
        await Expect(Chart).ToBeVisibleAsync();
        await Expect(Page.Locator(".kings-card")).ToContainTextAsync("Isaiah");
    }
}

public class KingsPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Chart_scrolls_sideways_and_a_tap_shows_the_card_without_page_overflow()
    {
        await Open("#/kings?sel=hezekiah");
        var scroll = Page.Locator(".kings-scroll");
        await Expect(scroll).ToBeVisibleAsync();
        Assert.That(await scroll.EvaluateAsync<bool>("e => e.scrollWidth > e.clientWidth + 1000"), "the chart scrolls horizontally");
        Assert.That(await Page.EvaluateAsync<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), "the page itself does not scroll sideways");
        await Expect(Page.Locator(".kings-card")).ToContainTextAsync("Hezekiah");
        var box = await Page.Locator(".kings-king[data-slug='hezekiah']").BoundingBoxAsync();
        Assert.That(box!.X, Is.GreaterThanOrEqualTo(0));
        Assert.That(box.X + box.Width, Is.LessThanOrEqualTo(390 + 1), "the selected reign was brought into view");

        await Page.Locator(".kings-king[data-slug='manasseh']").TapAsync();
        await Expect(Page.Locator(".kings-card")).ToContainTextAsync("Manasseh");
    }
}

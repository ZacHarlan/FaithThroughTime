using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class DetailSheetTests : E2ETest
{
    ILocator Heading1 => Sheet.GetByRole(AriaRole.Heading, new() { Level = 1 });

    ILocator Section(string heading) => Sheet.Locator("section")
        .Filter(new() { Has = Page.GetByRole(AriaRole.Heading, new() { Name = heading, Exact = true }) });

    [Test]
    public async Task Person_shows_name_and_dates()
    {
        await Open("#/person/david");
        await Expect(Heading1).ToHaveTextAsync("David");
        var dates = await Eval<string>("Store.dates(Store.person('david'))");
        await Expect(Sheet).ToContainTextAsync(dates);
    }

    [Test]
    public async Task Scripture_row_expands_to_show_verse_text()
    {
        await Open("#/person/david");
        var row = Section("Scripture").GetByRole(AriaRole.Button).First;
        await Expect(row).ToHaveAttributeAsync("aria-expanded", "false");
        await row.ClickAsync();
        await Expect(row).ToHaveAttributeAsync("aria-expanded", "true");
        var passage = Section("Scripture").Locator("blockquote").First;
        await Expect(passage).ToBeVisibleAsync();
        await Expect(passage).Not.ToBeEmptyAsync();
        Assert.That((await passage.InnerTextAsync()).Trim().Length, Is.GreaterThan(30), "a verse, not a placeholder");
    }

    [Test]
    public async Task Event_shows_the_people_involved()
    {
        await Open("#/");
        var slug = await Eval<string>("Store.events.find(e => Store.peopleOf(e).length >= 2).slug");
        var firstPerson = await Eval<string>($"Store.peopleOf(Store.event('{slug}'))[0].person.name");
        await NavigateTo($"#/event/{slug}");
        await Expect(Heading1).ToBeVisibleAsync();
        await Expect(Section("People")).ToBeVisibleAsync();
        await Expect(Section("People").GetByRole(AriaRole.Link, new() { Name = firstPerson }).First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Unknown_slug_shows_the_not_found_state()
    {
        await Open("#/person/no-such-person");
        await Expect(Heading1).ToContainTextAsync("We could not find that person");
        await Open("#/event/no-such-event");
        await Expect(Heading1).ToContainTextAsync("We could not find that event");
    }

    [Test]
    public async Task Escape_closes_the_sheet()
    {
        await Open("#/person/david");
        await Expect(Sheet).ToBeVisibleAsync();
        await Page.Keyboard.PressAsync("Escape");
        await Expect(Sheet).ToBeHiddenAsync();
        await ExpectHash("/timeline");
    }
}

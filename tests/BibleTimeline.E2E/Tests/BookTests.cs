using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class BookTests : E2ETest
{
    [Test]
    public async Task Genesis_shows_author_outline_key_verse_people_and_a_journey()
    {
        await Open("#/book/genesis");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Genesis");
        await Expect(Page).ToHaveTitleAsync(new Regex("^Genesis"));
        await Expect(Page.Locator(".bk-facts")).ToContainTextAsync("Moses");
        await Expect(Page.Locator(".bk-facts")).ToContainTextAsync("BC");

        var outline = Page.Locator("a.bk-part");
        Assert.That(await outline.CountAsync(), Is.InRange(4, 10));
        await Expect(outline.First).ToHaveAttributeAsync("href", new Regex("^#/read/genesis/1"));

        await Expect(Page.Locator(".bk-verse", new() { HasText = "Genesis 1:1" }))
            .ToContainTextAsync("In the beginning", new() { Timeout = 10000 });

        var people = Page.Locator(".bk-holdings a.chip-entity", new() { HasText = "Abraham" });
        await Expect(people.First).ToBeVisibleAsync(new() { Timeout = 10000 });
        await Expect(Page.Locator(".bk-holdings a.bk-row", new() { HasText = "Abraham: The Friend of God" })).ToBeVisibleAsync();

        await Page.GetByRole(AriaRole.Link, new() { Name = "Start reading" }).ClickAsync();
        await ExpectHash("/read/genesis/1");
    }

    [Test]
    public async Task Chapter_grid_and_neighbours_link_onward()
    {
        await Open("#/book/genesis");
        Assert.That(await Page.Locator("a.bk-chapter").CountAsync(), Is.EqualTo(50));
        await Page.GetByRole(AriaRole.Link, new() { Name = "Genesis chapter 12" }).ClickAsync();
        await ExpectHash("/read/genesis/12");

        await NavigateTo("#/book/genesis");
        await Page.Locator(".bk-pager-link.is-next").ClickAsync();
        await ExpectHash("/book/exodus");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Exodus");
    }

    [Test]
    public async Task Philemon_has_one_chapter_and_outlines_by_verse()
    {
        await Open("#/book/philemon");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Philemon");
        Assert.That(await Page.Locator("a.bk-chapter").CountAsync(), Is.EqualTo(1));
        await Expect(Page.Locator("a.bk-part").Nth(1)).ToContainTextAsync("Onesimus");
        await Expect(Page.Locator("a.bk-part").Nth(1)).ToHaveAttributeAsync("href", new Regex("^#/read/philemon/1"));
        await Expect(Page.Locator(".bk-verse").First).ToContainTextAsync(new Regex("\\w{4}"), new() { Timeout = 10000 });
    }

    [Test]
    public async Task Unknown_book_shows_not_found_and_bare_route_goes_to_the_library()
    {
        await Open("#/book/no-such-book");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("could not find that book");

        await NavigateTo("#/book");
        await ExpectHash("/read$");
    }
}

public class BookPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Book_page_fits_a_phone()
    {
        await Open("#/book/genesis");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Genesis");
        await Expect(Page.Locator(".bk-holdings a.chip-entity").First).ToBeVisibleAsync(new() { Timeout = 10000 });
        var overflow = await Eval<int>("() => document.documentElement.scrollWidth - document.documentElement.clientWidth");
        Assert.That(overflow, Is.LessThanOrEqualTo(1), "the page does not scroll sideways");
        var box = await Page.Locator("a.bk-part").First.BoundingBoxAsync();
        Assert.That(box!.Height, Is.GreaterThanOrEqualTo(44), "outline rows are comfortable touch targets");
    }
}

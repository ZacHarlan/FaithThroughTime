using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class ShareTests : E2ETest
{
    [Test]
    public async Task Sharing_a_comparison_shows_a_rendered_card_and_Escape_closes_it()
    {
        await Open("#/meet/noah/abraham");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Share", Exact = true }).ClickAsync();
        var dialog = Page.GetByRole(AriaRole.Dialog, new() { Name = "Share" });
        await Expect(dialog).ToBeVisibleAsync();

        var card = dialog.GetByRole(AriaRole.Img, new() { NameRegex = new Regex("^Share card") });
        await Expect(card).ToBeVisibleAsync();
        await Page.WaitForFunctionAsync("() => { const i = document.querySelector('#share img'); return i && i.complete && i.naturalWidth > 0; }");
        var box = await card.BoundingBoxAsync();
        Assert.That(box!.Width, Is.GreaterThan(50));
        Assert.That(box.Height, Is.GreaterThan(50));

        await Page.Keyboard.PressAsync("Escape");
        await Expect(dialog).ToBeHiddenAsync();
        await ExpectHash("/meet/noah/abraham");   // closing the card leaves the comparison in place
    }
}

public class TourTests : E2ETest
{
    ILocator Chapter(int n) => Page.GetByText(new Regex($@"^Chapter {n} of \d+$"));

    [Test]
    public async Task First_chapter_shows_a_title()
    {
        await Open("#/story/the-whole-story/1");
        await Expect(Chapter(1)).ToBeVisibleAsync();
        var title = Page.GetByRole(AriaRole.Heading, new() { Level = 2 });
        await Expect(title).ToBeVisibleAsync();
        await Expect(title).Not.ToBeEmptyAsync();
    }

    [Test]
    public async Task Next_goes_to_step_2_and_the_url_follows()
    {
        await Open("#/story/the-whole-story/1");
        var firstTitle = await Page.GetByRole(AriaRole.Heading, new() { Level = 2 }).InnerTextAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Next", Exact = true }).ClickAsync();
        await ExpectHash("/story/the-whole-story/2");
        await Expect(Chapter(2)).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2 })).Not.ToHaveTextAsync(firstTitle);
    }

    [Test]
    public async Task Exit_returns_to_the_timeline()
    {
        await Open("#/story/the-whole-story/2");
        await Expect(Chapter(2)).ToBeVisibleAsync();
        await Page.GetByRole(AriaRole.Button, new() { Name = "Exit the tour" }).ClickAsync();
        await ExpectHash("/timeline");
        await Expect(Chapter(2)).ToBeHiddenAsync();
        await Expect(TimelineCanvas).ToBeVisibleAsync();
    }
}

public class AboutTests : E2ETest
{
    [Test]
    public async Task About_page_renders_and_names_Ussher()
    {
        await Open("#/about");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("Where the dates come from");
        await Expect(Page.GetByText("Ussher").First).ToBeVisibleAsync();
    }
}

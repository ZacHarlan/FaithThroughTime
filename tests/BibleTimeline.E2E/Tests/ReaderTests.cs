using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class ReaderTests : E2ETest
{
    [Test]
    public async Task John_3_16_is_highlighted_and_reads_in_the_ESV()
    {
        await Open("#/read/john/3?v=16");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^John\s*3$"));
        await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();
        // The highlight is a styling hook only (.is-hl): check it is on verse 16 and visibly different from verse 15.
        var v16 = Page.Locator(".verse[data-v='16']");
        var v15 = Page.Locator(".verse[data-v='15']");
        await Expect(v16).ToHaveClassAsync(new Regex(@"\bis-hl\b"));
        await Expect(v16).ToContainTextAsync("For God so loved the world");
        await Expect(v15).Not.ToHaveClassAsync(new Regex(@"\bis-hl\b"));
        Assert.That(await v16.EvaluateAsync<string>("e => getComputedStyle(e).boxShadow"),
            Is.Not.EqualTo(await v15.EvaluateAsync<string>("e => getComputedStyle(e).boxShadow")), "verse 16 should look highlighted");
    }

    [Test]
    public async Task Next_chapter_goes_to_John_4()
    {
        await Open("#/read/john/3?v=16");
        await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();
        await Page.GetByLabel("Next chapter").First.ClickAsync();
        await ExpectHash("/read/john/4");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^John\s*4$"));
    }

    [Test]
    public async Task Unknown_book_shows_a_helpful_message()
    {
        await Open("#/read/no-such-book/1");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("We could not find that book");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Back to the library" })).ToBeVisibleAsync();
    }
}

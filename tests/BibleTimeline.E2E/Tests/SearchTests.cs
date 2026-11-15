using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class SearchTests : E2ETest
{
    ILocator Options => SearchDialog.GetByRole(AriaRole.Option);

    async Task Search(string text)
    {
        await Open("#/");
        await Page.Keyboard.PressAsync("/");
        await Expect(SearchInput).ToBeFocusedAsync();
        await SearchInput.PressSequentiallyAsync(text);
    }

    [Test]
    public async Task Typing_david_lists_David_first()
    {
        await Search("david");
        await Expect(Options.First).ToContainTextAsync("David");
        await Expect(Options.First).ToContainTextAsync(new Regex("^David"));
    }

    [Test]
    public async Task Enter_opens_the_top_result()
    {
        await Search("david");
        await Expect(Options.First).ToContainTextAsync("David");
        await Page.Keyboard.PressAsync("Enter");
        await ExpectHash("/person/david");
        await Expect(Sheet.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("David");
        await Expect(SearchDialog).ToBeHiddenAsync();
    }

    [Test]
    public async Task A_scripture_reference_offers_reading_the_passage()
    {
        await Search("john 3:16");
        var read = Options.Filter(new() { HasText = "Read John 3:16" });
        await Expect(read).ToBeVisibleAsync();
        await read.ClickAsync();
        await ExpectHash("/read/john/3\\?v=16");
    }

    [Test]
    public async Task Two_names_offer_the_comparison()
    {
        await Search("noah and abraham");
        var meet = Options.Filter(new() { HasText = "Did Noah and Abraham meet?" });
        await Expect(meet).ToBeVisibleAsync();
        await meet.ClickAsync();
        await ExpectHash("/meet/noah/abraham");
    }
}

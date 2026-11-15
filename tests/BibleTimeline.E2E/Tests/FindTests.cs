using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class FindTests : E2ETest
{
    ILocator Hits => Page.Locator(".find-hit");

    [Test]
    public async Task A_phrase_finds_Psalm_23_1_and_links_to_the_verse()
    {
        await Open("#/find?q=%22the+Lord+is+my+shepherd%22&v=esv");
        var hit = Hits.Filter(new() { HasText = "Psalms 23:1" }).Or(Hits.Filter(new() { HasText = "Psalm 23:1" })).First;
        await Expect(hit).ToBeVisibleAsync();
        await Expect(hit).ToContainTextAsync("shepherd");
        await hit.ClickAsync();
        await ExpectHash("/read/psalms/23\\?v=1");
        await Expect(Page.Locator(".verse[data-v='1']")).ToHaveClassAsync(new Regex(@"\bis-hl\b"));
    }

    [Test]
    public async Task Matched_words_are_marked_and_visible()
    {
        await Open("#/find?q=shepherd*&v=kjv");
        await Expect(Hits.First).ToBeVisibleAsync();
        var mark = Page.Locator(".find-hit mark").First;
        await Expect(mark).ToBeVisibleAsync();
        await Expect(mark).ToHaveTextAsync(new Regex("^shepherd", RegexOptions.IgnoreCase));
        Assert.That(await mark.EvaluateAsync<string>("e => getComputedStyle(e).backgroundColor"), Is.Not.EqualTo("rgba(0, 0, 0, 0)"));
    }

    [Test]
    public async Task A_scoped_search_stays_in_its_book_and_the_URL_follows()
    {
        await Open("#/find?q=love&v=kjv");
        await Expect(Hits.First).ToBeVisibleAsync();
        await Page.GetByLabel("Where to search").SelectOptionAsync("1-john");
        await ExpectHash("/find\\?.*in=1-john");
        await Expect(Page.Locator(".find-book-head")).ToHaveCountAsync(1);
        await Expect(Page.Locator(".find-book-head")).ToContainTextAsync("1 John");
        Assert.That(await Hits.CountAsync(), Is.GreaterThan(5));
    }

    [Test]
    public async Task No_match_says_so_and_offers_another_way()
    {
        await Open("#/find?q=zzyzxq&v=kjv");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Nothing says" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Try the ESV" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task The_palette_offers_to_search_the_text_of_Scripture()
    {
        await Open("#/");
        await Page.Keyboard.PressAsync("/");
        await Expect(SearchInput).ToBeFocusedAsync();
        await SearchInput.PressSequentiallyAsync("love your enemies");
        var row = SearchDialog.GetByRole(AriaRole.Option, new() { Name = "Search the text of Scripture" });
        await Expect(row).ToBeVisibleAsync();
        await row.ClickAsync();
        await ExpectHash("/find\\?q=love(\\+|%20)your(\\+|%20)enemies");
        await Expect(Hits.First).ToBeVisibleAsync();
        await Expect(Page).ToHaveTitleAsync(new Regex("Search Scripture"));
    }
}

public class FindPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task The_search_page_fits_a_phone()
    {
        await Open("#/find?q=%22fear+not%22&v=kjv");
        await Expect(Page.Locator(".find-hit").First).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), "no sideways scrolling");
        var box = await Page.Locator(".find-input").BoundingBoxAsync();
        Assert.That(box!.Width, Is.GreaterThan(300));
        Assert.That(box.Height, Is.GreaterThanOrEqualTo(44));
    }
}

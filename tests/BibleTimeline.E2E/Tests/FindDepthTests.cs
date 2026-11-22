using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class FindDepthTests : E2ETest
{
    ILocator Hits => Page.Locator(".find-hit");

    [Test]
    public async Task A_word_also_finds_its_forms_and_equals_finds_only_the_word()
    {
        await Open("#/find?q=love&v=kjv&in=john");
        await Expect(Hits.Filter(new() { HasText = "John 3:16" })).ToBeVisibleAsync();
        await Expect(Page.Locator(".find-hit mark").First).ToBeVisibleAsync();

        await Open("#/find?q=%3Dlove&v=kjv&in=john");
        await Expect(Hits.First).ToBeVisibleAsync();
        await Expect(Hits.Filter(new() { HasText = "John 3:16" })).ToHaveCountAsync(0);
        await Expect(Page.Locator(".find-hit mark").First).ToHaveTextAsync(new Regex("^love$", RegexOptions.IgnoreCase));
    }

    [Test]
    public async Task The_Exact_words_switch_matches_only_the_word_and_the_URL_follows()
    {
        await Open("#/find?q=love&v=kjv&in=john");
        await Expect(Hits.Filter(new() { HasText = "John 3:16" })).ToBeVisibleAsync();
        await Page.GetByLabel("Exact words").CheckAsync();
        await ExpectHash("/find\\?.*x=1");
        await Expect(Hits.Filter(new() { HasText = "John 3:16" })).ToHaveCountAsync(0);
    }

    [Test]
    public async Task A_Strongs_number_lists_its_verses_with_the_lemma_and_a_link_to_the_word_page()
    {
        await Open("#/find?q=G26&v=kjv");
        var card = Page.Locator(".find-strongs-card");
        await Expect(card).ToContainTextAsync("ἀγάπη");
        await Expect(card.GetByRole(AriaRole.Link, new() { Name = "Full entry for G26" })).ToHaveAttributeAsync("href", "#/word/G26");
        await Expect(Hits.Filter(new() { HasText = "1 John 4:8" })).ToBeVisibleAsync();
        await Expect(Page).ToHaveTitleAsync(new Regex("Search Scripture: G26"));

        await Open("#/find?q=strongs%3AG26&v=kjv&in=1-john");
        await Expect(Page.Locator(".find-book-head")).ToHaveCountAsync(1);
        await Expect(Hits.Filter(new() { HasText = "1 John 4:8" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task A_word_search_offers_original_words_and_the_chip_runs_that_search()
    {
        await Open("#/find?q=love&v=kjv&in=1-john");
        var chip = Page.Locator(".find-original-chip").First;
        await Expect(chip).ToBeVisibleAsync();
        await Expect(chip).ToContainTextAsync(new Regex(@"[HG]\d+ \("));
        await chip.ClickAsync();
        await ExpectHash("/find\\?q=[HG]\\d+");
        await Expect(Page.Locator(".find-strongs-card")).ToBeVisibleAsync();
        await Expect(Hits.First).ToBeVisibleAsync();
    }
}

public class FindDepthPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Original_word_search_and_suggestions_fit_a_phone()
    {
        await Open("#/find?q=love&v=kjv&in=1-john");
        await Expect(Page.Locator(".find-original-chip").First).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), "no sideways scrolling (word search)");
        await Open("#/find?q=H2617&v=kjv");
        await Expect(Page.Locator(".find-strongs-card")).ToBeVisibleAsync();
        await Expect(Page.Locator(".find-hit").First).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), "no sideways scrolling (Strong's)");
    }
}

using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class WordTests : E2ETest
{
    [Test]
    public async Task H7225_shows_the_Hebrew_lemma_a_definition_and_Genesis_1_1()
    {
        await Open("#/word/H7225");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("\u05E8\u05B5\u05D0\u05E9\u05C1\u05B4\u05D9\u05EA");
        var lemma = Page.Locator(".words-lemma-big");
        await Expect(lemma).ToHaveAttributeAsync("lang", "he");
        await Expect(lemma).ToHaveAttributeAsync("dir", "rtl");
        await Expect(Page.Locator(".words-entry")).ToContainTextAsync("the first, in place, time, order or rank");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2 }).First).ToContainTextAsync("verses use H7225");

        var gen = Page.GetByRole(AriaRole.Link, new() { Name = "Genesis 1:1" });
        await Expect(gen).ToBeVisibleAsync();
        await Expect(Page.Locator(".words-verse").First).ToContainTextAsync("In the beginning God created");
        await Expect(Page.Locator(".words-hit").First).ToHaveTextAsync("beginning");
        await gen.ClickAsync();
        await ExpectHash("/read/genesis/1");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^Genesis\s*1$"));
    }

    [Test]
    public async Task Lookup_by_G26_opens_agape()
    {
        await Open("#/word");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("behind the words");
        await Page.GetByLabel("Strong’s number", new() { Exact = true }).FillAsync("G26");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Look up" }).ClickAsync();
        await ExpectHash("/word/G26");
        await Expect(Page.Locator(".words-lemma-big")).ToHaveTextAsync("ἀγάπη");
        await Expect(Page.Locator(".words-lemma-big")).ToHaveAttributeAsync("lang", "el");
        await Expect(Page.Locator(".words-entry")).ToContainTextAsync("love, i.e. affection or benevolence");
    }

    [Test]
    public async Task Lookup_by_number_and_the_Greek_toggle()
    {
        await Open("#/word");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Greek" }).ClickAsync();
        await Page.GetByLabel("Strong’s number", new() { Exact = true }).FillAsync("3056");
        await Page.GetByLabel("Strong’s number", new() { Exact = true }).PressAsync("Enter");
        await ExpectHash("/word/G3056");
        await Expect(Page.Locator(".words-lemma-big")).ToHaveTextAsync("λόγος");
    }

    [Test]
    public async Task Starting_words_are_listed_and_unknown_numbers_say_so()
    {
        await Open("#/word");
        await Expect(Page.Locator(".words-starter-lemma").First).Not.ToBeEmptyAsync();
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "H2617" })).ToBeVisibleAsync();
        await Page.GetByLabel("Strong’s number", new() { Exact = true }).FillAsync("H9999");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Look up" }).ClickAsync();
        await Expect(Page.Locator("#words-msg")).ToContainTextAsync("no entry H9999");
    }

    [Test]
    public async Task Study_panel_shows_original_words_for_a_verse()
    {
        await Open("#/read/john/3?v=16");
        await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();
        await Page.EvaluateAsync("Study.open({ book: Store.book('john'), chapter: 3, verse: 16, version: 'esv', ref: 'John 3:16' })");
        var section = Page.Locator(".sp-sec[data-section='words']");
        var loved = section.GetByRole(AriaRole.Button, new() { Name = "loved", Exact = true });
        await loved.ScrollIntoViewIfNeededAsync();
        await loved.ClickAsync();
        await Expect(section.Locator(".words-detail")).ToContainTextAsync("agapáō");
        await section.GetByRole(AriaRole.Link, new() { Name = "Study G25" }).ClickAsync();
        await ExpectHash("/word/G25");
    }

    [Test]
    public async Task Show_more_adds_verses()
    {
        await Open("#/word/H430");
        var verses = Page.Locator(".words-verse");
        await Expect(verses).ToHaveCountAsync(20);
        await Page.GetByRole(AriaRole.Button, new() { Name = "Show more" }).ClickAsync();
        await Expect(verses).ToHaveCountAsync(40);
    }
}

public class WordPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Word_page_fits_the_phone()
    {
        await Open("#/word/G26");
        await Expect(Page.Locator(".words-lemma-big")).ToBeVisibleAsync();
        await Expect(Page.Locator(".words-verse").First).ToBeVisibleAsync();
        var overflow = await Eval<bool>("document.documentElement.scrollWidth > window.innerWidth + 1");
        Assert.That(overflow, Is.False, "no horizontal scrolling");
    }

    [Test]
    public async Task Lookup_page_fits_the_phone()
    {
        await Open("#/word");
        await Expect(Page.GetByLabel("Strong’s number", new() { Exact = true })).ToBeVisibleAsync();
        var box = await Page.GetByRole(AriaRole.Button, new() { Name = "Look up" }).BoundingBoxAsync();
        Assert.That(box!.Height, Is.GreaterThanOrEqualTo(40), "tap target");
        var overflow = await Eval<bool>("document.documentElement.scrollWidth > window.innerWidth + 1");
        Assert.That(overflow, Is.False);
    }
}

using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class DictionaryTests : E2ETest
{
    [Test]
    public async Task Index_finds_Abraham_as_you_type_and_opens_the_entry()
    {
        await Open("#/dictionary");
        await Expect(Page).ToHaveTitleAsync(new Regex("Bible dictionary"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("Scripture");
        await Page.GetByRole(AriaRole.Searchbox, new() { Name = "Search the dictionary" }).FillAsync("abrah");
        var hit = Page.GetByRole(AriaRole.Link, new() { Name = "Abraham", Exact = true });
        await Expect(hit).ToBeVisibleAsync();
        await hit.ClickAsync();
        await ExpectHash("/dictionary/abraham");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Abraham");
        await Expect(Page).ToHaveTitleAsync(new Regex("^Abraham"));
    }

    [Test]
    public async Task Letter_bar_lists_the_entries_under_a_letter()
    {
        await Open("#/dictionary");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Entries beginning with Z" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Zebulun", Exact = true })).ToBeVisibleAsync();
    }

    [Test]
    public async Task Entry_has_text_a_working_reader_link_and_cross_references()
    {
        await Open("#/dictionary/abraham");
        var body = Page.GetByRole(AriaRole.Article, new() { Name = "Abraham" });
        await Expect(body).ToContainTextAsync("Father of a multitude");
        await Expect(Page.GetByText("Easton's Bible Dictionary (1897)")).ToBeVisibleAsync();
        var link = body.GetByRole(AriaRole.Link, new() { Name = "Gen. 11:27" }).First;
        await Expect(link).ToHaveAttributeAsync("href", new Regex("#/read/genesis/11\\?v=27"));
        await Expect(body.Locator("a.dict-xref").First).ToBeVisibleAsync();
        await link.ClickAsync();
        await ExpectHash("/read/genesis/11");

        await Open("#/dictionary/aaron");
        var xref = Page.Locator("a.dict-xref", new() { HasText = "MOSES" }).First;
        await xref.ClickAsync();
        await ExpectHash("/dictionary/moses");
    }

    [Test]
    public async Task Bethel_links_to_its_place_page_and_unknown_slug_is_not_found()
    {
        await Open("#/dictionary/bethel");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Bethel");
        await Expect(Page.GetByRole(AriaRole.Article, new() { Name = "Bethel" })).ToContainTextAsync("House of God");
        await Expect(Page.Locator("a[href^='#/place/']")).ToHaveCountAsync(1);

        await Open("#/dictionary/no-such-entry-here");
        await Expect(Page.GetByRole(AriaRole.Alert)).ToContainTextAsync("could not find that entry");
    }

    [Test]
    public async Task BlockFor_gives_a_block_for_Abraham_and_null_for_a_minor_namesake()
    {
        await Open("#/dictionary");
        var abraham = await Eval<string>(
            "(async () => { const n = await Dictionary.blockFor(Store.people.find(p => p.name === 'Abraham')); " +
            "return n && n.nodeType === 1 ? n.textContent + '|' + n.querySelector('a').getAttribute('href') : null; })()");
        Assert.That(abraham, Does.StartWith("From Easton's Bible Dictionary"));
        Assert.That(abraham, Does.Contain("Father of a multitude"));
        Assert.That(abraham, Does.EndWith("|#/dictionary/abraham"));

        var minor = await Eval<bool>(
            "(async () => (await Dictionary.blockFor(Store.people.find(p => p.name === 'Mary, mother of John Mark'))) === null)()");
        Assert.That(minor, Is.True, "a minor namesake gets no block");
        var major = await Eval<bool>(
            "(async () => (await Dictionary.blockFor(Store.people.find(p => p.name === 'Mary, mother of Jesus'))) !== null)()");
        Assert.That(major, Is.True, "the most significant Mary does");
        var place = await Eval<bool>(
            "(async () => (await Dictionary.blockFor(Store.locations.find(l => l.name === 'Bethel'))) !== null)()");
        Assert.That(place, Is.True, "Bethel the place does");
        Assert.That(await Eval<string>("Dictionary.find('Abraham')"), Is.EqualTo("abraham"));
    }
}

public class DictionaryPhoneTests : E2ETest
{
    protected override bool Phone => true;
    const string Overflow = "() => document.documentElement.scrollWidth - document.documentElement.clientWidth";

    [Test]
    public async Task Index_and_entry_fit_a_phone()
    {
        await Open("#/dictionary");
        await Expect(Page.GetByRole(AriaRole.Searchbox, new() { Name = "Search the dictionary" })).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the index does not scroll sideways");
        await NavigateTo("#/dictionary/abraham");
        await Expect(Page.GetByRole(AriaRole.Article, new() { Name = "Abraham" })).ToContainTextAsync("Father of a multitude");
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the entry does not scroll sideways");
    }
}

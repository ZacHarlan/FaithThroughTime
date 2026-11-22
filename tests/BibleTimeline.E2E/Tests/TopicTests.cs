using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class TopicTests : E2ETest
{
    [Test]
    public async Task Index_finds_Faith_by_search()
    {
        await Open("#/topic");
        await Expect(Page).ToHaveTitleAsync(new Regex("Topical Bible"));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2, Name = "Where to start" })).ToBeVisibleAsync();
        await Page.GetByLabel("Find a topic").FillAsync("faith");
        var faith = Page.Locator("a.tp-item", new() { HasText = "Faith" }).First;
        await Expect(faith).ToBeVisibleAsync();
        await Expect(Page.Locator("a.tp-item").First).ToContainTextAsync("Faith");
        await faith.ClickAsync();
        await ExpectHash("/topic/faith");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Faith");
    }

    [Test]
    public async Task Letter_bar_lists_the_topics_of_a_letter()
    {
        await Open("#/topic");
        await Page.GetByRole(AriaRole.Navigation, new() { Name = "Jump to a letter" }).GetByRole(AriaRole.Link, new() { Name = "K", Exact = true }).ClickAsync();
        await Expect(Page.Locator("a.tp-item", new() { HasText = "Kingdom" }).First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Faith_page_lists_references_with_text_and_links_to_the_reader()
    {
        await Open("#/topic/faith");
        await Expect(Page).ToHaveTitleAsync(new Regex("Faith"));
        await Expect(Page.GetByText("Nave’s Topical Bible").First).ToBeVisibleAsync();
        var section = Page.GetByRole(AriaRole.Region, new() { Name = "Enjoined" });
        await Expect(section).ToBeVisibleAsync();
        var rows = section.Locator(".tp-row.has-text");
        await Expect(rows).ToHaveCountAsync(3);
        await Expect(rows.First.Locator(".tp-text")).Not.ToBeEmptyAsync();
        await section.GetByRole(AriaRole.Button, new() { NameRegex = new Regex("^Show all") }).ClickAsync();
        Assert.That(await section.Locator(".tp-rest a.tp-ref:visible").CountAsync(), Is.GreaterThan(20));
        await rows.First.Locator("a.tp-ref").ClickAsync();
        await ExpectHash("/read/");
    }

    [Test]
    public async Task Study_panel_for_Hebrews_11_1_shows_a_Faith_chip()
    {
        await Open("#/read/hebrews/11?study=1");
        var panel = Page.Locator("#study-panel");
        var chip = panel.GetByRole(AriaRole.Link, new() { Name = "Faith", Exact = true });
        await Expect(chip).ToBeVisibleAsync();
        await chip.ClickAsync();
        await ExpectHash("/topic/faith");
    }

    [Test]
    public async Task Unknown_topic_says_so()
    {
        await Open("#/topic/no-such-topic");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("We could not find that topic");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Search the topics" })).ToBeVisibleAsync();
    }
}

public class TopicPhoneTests : E2ETest
{
    protected override bool Phone => true;

    const string Overflow = "() => document.documentElement.scrollWidth - document.documentElement.clientWidth";

    [Test]
    public async Task Index_and_topic_fit_a_phone()
    {
        await Open("#/topic");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 2, Name = "Where to start" })).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the index does not scroll sideways");
        await Page.GetByLabel("Find a topic").FillAsync("covenant");
        await Expect(Page.Locator("a.tp-item").First).ToBeVisibleAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1));

        await NavigateTo("#/topic/faith");
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Enjoined" }).Locator(".tp-text").First).Not.ToBeEmptyAsync();
        Assert.That(await Eval<int>(Overflow), Is.LessThanOrEqualTo(1), "the topic does not scroll sideways");
    }
}

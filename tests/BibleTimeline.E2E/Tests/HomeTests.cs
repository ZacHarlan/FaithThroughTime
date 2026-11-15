using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class HomeTests : E2ETest
{
    [Test]
    public async Task Hero_headline_is_visible()
    {
        await Open("#/");
        var headline = Page.GetByRole(AriaRole.Heading, new() { Level = 1 });
        await Expect(headline).ToBeVisibleAsync();
        await Expect(headline).ToContainTextAsync("One story");
    }

    [Test]
    public async Task Begin_the_story_goes_to_the_tour()
    {
        await Open("#/");
        await Page.GetByRole(AriaRole.Link, new() { Name = "Begin the story" }).ClickAsync();
        await ExpectHash("/story/the-whole-story/1");
        await Expect(Page.GetByText("Chapter 1 of")).ToBeVisibleAsync();
    }

    [Test]
    public async Task Explore_the_timeline_goes_to_the_timeline()
    {
        await Open("#/");
        await Page.GetByRole(AriaRole.Link, new() { Name = "Explore the timeline" }).ClickAsync();
        await ExpectHash("/timeline");
        await Expect(TimelineCanvas).ToBeVisibleAsync();
    }
}

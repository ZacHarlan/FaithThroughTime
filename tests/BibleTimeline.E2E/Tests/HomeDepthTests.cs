using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class HomeDepthTests : E2ETest
{
    // The reading plan's day for a date, as js/plan.js counts it (no leap day in the plan year).
    static int PlanDay(DateTime d)
    {
        var n = d.DayOfYear;
        if (DateTime.IsLeapYear(d.Year) && n > 59) n--;
        return Math.Clamp(n, 1, 365);
    }

    ILocator Welcome => Page.Locator(".home-welcome");

    [Test]
    public async Task Today_shows_the_plan_day_and_links_to_the_reader()
    {
        await Open("#/");
        var n = PlanDay(DateTime.Now);
        var card = Page.Locator(".today-read");
        await Expect(card).ToContainTextAsync($"Day {n} of 365");
        var first = card.Locator(".today-passages a").First;
        await Expect(first).ToHaveAttributeAsync("href", new Regex("^#/read/[a-z0-9-]+/\\d+"));
        await Expect(card.GetByRole(AriaRole.Link, new() { Name = $"Open day {n}" })).ToHaveAttributeAsync("href", $"#/plan/{n}");
        await first.ClickAsync();
        await ExpectHash("/read/");
    }

    [Test]
    public async Task The_pick_card_links_to_a_real_page()
    {
        await Open("#/");
        var link = Page.Locator(".today-pick a[data-pick]");
        await Expect(link).ToBeVisibleAsync();
        await Expect(link).ToHaveAttributeAsync("href", new Regex("^#/(meet|map|prophecy|parallel)/"));
        await link.ClickAsync();
        await ExpectHash("/(meet|map|prophecy|parallel)/");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 }).First).ToBeVisibleAsync();
        Assert.That(await Eval<string>("Router.current.view"), Does.Match("^(meet|map|prophecy|parallel)$"));
    }

    [Test]
    public async Task Welcome_shows_on_a_fresh_profile_and_stays_dismissed()
    {
        await Open("#/");
        await Expect(Welcome).ToBeVisibleAsync();
        await Expect(Welcome.GetByRole(AriaRole.Heading, new() { Name = "Start here" })).ToBeVisibleAsync();
        Assert.That(await Welcome.Locator("a.welcome-path").CountAsync(), Is.EqualTo(4));
        await Expect(Welcome.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("Study a verse") }))
            .ToHaveAttributeAsync("href", new Regex("^#/read/john/3\\?.*study=16"));

        await Welcome.GetByRole(AriaRole.Button, new() { Name = "Got it" }).ClickAsync();
        await Expect(Welcome).ToBeHiddenAsync();

        await Page.ReloadAsync();
        await WaitUntilReady();
        await Expect(Welcome).ToBeHiddenAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "New here?" }).ClickAsync();
        await Expect(Welcome).ToBeVisibleAsync();
    }

    [Test]
    public async Task The_install_bar_does_not_appear_on_a_first_visit()
    {
        await Open("#/");
        await Page.EvaluateAsync("window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }))");
        await Page.WaitForTimeoutAsync(4500);
        Assert.That(await Eval<int>("Install.visits()"), Is.EqualTo(1));
        Assert.That(await Page.Locator(".install-bar").CountAsync(), Is.EqualTo(0));
    }

    [Test]
    public async Task The_ways_in_name_the_study_tools()
    {
        await Open("#/");
        var row = Page.Locator(".ways-study");
        await Expect(row.GetByRole(AriaRole.Link, new() { Name = "Study tools", Exact = true })).ToHaveAttributeAsync("href", "#/study");
        await Expect(row).ToContainTextAsync("Reading plan");
        await Expect(row).ToContainTextAsync("Kings and prophets");
    }
}

public class HomeDepthPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task The_hero_is_still_in_the_first_screen_with_the_welcome_showing()
    {
        await Open("#/");
        await Expect(Page.Locator(".home-welcome")).ToBeVisibleAsync();
        var title = Page.GetByRole(AriaRole.Heading, new() { Level = 1 });
        await Expect(title).ToBeVisibleAsync();
        var box = await title.BoundingBoxAsync();
        var height = await Eval<int>("window.innerHeight");
        Assert.That(box!.Y + box.Height, Is.LessThan(height), "the headline must be in the first screen");
        var welcome = await Page.Locator(".home-welcome").BoundingBoxAsync();
        var hero = await Page.Locator(".home-hero").BoundingBoxAsync();
        Assert.That(welcome!.Y, Is.GreaterThanOrEqualTo(hero!.Y + hero.Height - 1), "the welcome sits below the hero");
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth"), Is.True, "no sideways scroll");
    }
}

using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class PlanTests : E2ETest
{
    ILocator Title => Page.GetByRole(AriaRole.Heading, new() { Level = 1 });

    [Test]
    public async Task Day_1_starts_with_Genesis_1_and_links_to_the_reader()
    {
        await Open("#/plan/1");
        await Expect(Title).ToHaveTextAsync("Creation: the six days and the garden");
        await Expect(Page.Locator(".plan-head .eyebrow")).ToContainTextAsync("Day 1 of 365");
        Assert.That(await Page.TitleAsync(), Does.StartWith("Reading plan — Day 1"));

        var passage = Page.GetByRole(AriaRole.Link, new() { Name = "Genesis 1–2" });
        await Expect(passage).ToHaveAttributeAsync("href", "#/read/genesis/1");
        await Page.GetByRole(AriaRole.Link, new() { Name = "Genesis 2", Exact = true }).ClickAsync();
        await ExpectHash("/read/genesis/2");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^Genesis\s*2$"));
    }

    [Test]
    public async Task Next_and_previous_day_move_one_day()
    {
        await Open("#/plan/1");
        await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Next day") }).ClickAsync();
        await ExpectHash("/plan/2");
        await Expect(Page.Locator(".plan-head .eyebrow")).ToContainTextAsync("Day 2 of 365");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Genesis 3–6" })).ToBeVisibleAsync();

        await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Previous day") }).ClickAsync();
        await ExpectHash("/plan/1");
        await Expect(Title).ToHaveTextAsync("Creation: the six days and the garden");
    }

    [Test]
    public async Task The_year_lets_you_jump_to_any_day()
    {
        await Open("#/plan/1");
        await Page.Locator("a.plan-cell").Filter(new() { HasTextRegex = new Regex("^200$") }).ClickAsync();
        await ExpectHash("/plan/200");
        await Expect(Page.Locator(".plan-head .eyebrow")).ToContainTextAsync("Day 200 of 365");
        await Expect(Page.Locator("a.plan-cell.is-current")).ToHaveTextAsync("200");
        Assert.That(await Page.TitleAsync(), Does.StartWith("Reading plan — Day 200"));
    }

    [Test]
    public async Task The_story_year_links_to_the_timeline_at_that_year()
    {
        await Open("#/plan/1");
        var link = Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("See it on the timeline") });
        await Expect(link).ToContainTextAsync("4004 BC");
        await link.ClickAsync();
        await ExpectHash(@"/timeline\?y=-4004");
    }

    [Test]
    public async Task Plan_opens_on_todays_day_and_continue_returns_to_the_last_day()
    {
        await Open("#/plan");
        await ExpectHash(@"/plan/\d+");
        await Expect(Title).ToBeVisibleAsync();

        await NavigateTo("#/plan/40");
        await Expect(Page.Locator(".plan-head .eyebrow")).ToContainTextAsync("Day 40 of 365");
        await NavigateTo("#/plan/41");
        await Expect(Page.Locator(".plan-head .eyebrow")).ToContainTextAsync("Day 41 of 365");
        await Page.GetByRole(AriaRole.Link, new() { Name = "Continue with day 40" }).ClickAsync();
        await ExpectHash("/plan/40");
    }

    [Test]
    public async Task A_day_outside_the_plan_says_so()
    {
        await Open("#/plan/400");
        await Expect(Title).ToHaveTextAsync("That day is not in the plan");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Open today’s reading" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task Last_day_has_Revelation_22()
    {
        await Open("#/plan/365");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Revelation 20–22" })).ToBeVisibleAsync();
        await Expect(Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Next day") })).ToHaveCountAsync(0);
    }
}

public class PlanPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task The_day_fits_the_phone_and_can_be_turned()
    {
        await Open("#/plan/1");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Genesis 1–2" })).ToBeVisibleAsync();
        Assert.That(await Eval<bool>("document.documentElement.scrollWidth <= window.innerWidth + 1"), Is.True, "no horizontal scroll");

        var chip = await Page.GetByRole(AriaRole.Link, new() { Name = "Genesis 2", Exact = true }).BoundingBoxAsync();
        Assert.That(chip!.Height, Is.GreaterThanOrEqualTo(43), "chapter links are comfortable to tap");
        var cell = await Page.Locator("a.plan-cell").First.BoundingBoxAsync();
        Assert.That(cell!.Height, Is.GreaterThanOrEqualTo(43), "calendar days are comfortable to tap");

        await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Next day") }).TapAsync();
        await ExpectHash("/plan/2");
        await Expect(Page.Locator(".plan-head .eyebrow")).ToContainTextAsync("Day 2 of 365");
    }
}

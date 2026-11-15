using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class ShellTests : E2ETest
{
    [Test]
    public async Task App_loads_and_the_splash_goes_away()
    {
        await Open("#/");
        await Expect(Page).ToHaveTitleAsync(new Regex("Faith Through Time"));
        await Expect(Page.Locator("#splash")).ToBeHiddenAsync();
        await Expect(PrimaryNav).ToBeVisibleAsync();
    }

    [TestCase("Timeline", "#/timeline")]
    [TestCase("Did They Meet?", "#/meet")]
    [TestCase("Family Tree", "#/family")]
    [TestCase("Map", "#/map")]
    [TestCase("Read", "#/read")]
    public async Task Primary_nav_link_routes_and_marks_itself_current(string name, string hash)
    {
        await Open("#/");
        await PrimaryNav.GetByRole(AriaRole.Link, new() { Name = name, Exact = true }).ClickAsync();
        await ExpectHash(hash.Substring(1));
        await Expect(PrimaryNav.GetByRole(AriaRole.Link, new() { Name = name, Exact = true })).ToHaveAttributeAsync("aria-current", "page");
        await Expect(PrimaryNav.Locator("[aria-current=page]")).ToHaveCountAsync(1);
    }

    [Test]
    public async Task About_link_routes_to_the_about_page()
    {
        await Open("#/");
        await Page.GetByRole(AriaRole.Link, new() { Name = "About the dates and sources", Exact = true }).ClickAsync();
        await ExpectHash("/about");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("Where the dates come from");
    }

    [Test]
    public async Task Theme_toggle_switches_data_theme_and_persists_across_reload()
    {
        await Open("#/");
        var html = Page.Locator("html");
        await Expect(html).ToHaveAttributeAsync("data-theme", "dark");

        await Page.GetByRole(AriaRole.Button, new() { Name = "Switch to light theme" }).ClickAsync();
        await Expect(html).ToHaveAttributeAsync("data-theme", "light");
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Switch to dark theme" })).ToBeVisibleAsync();

        await Page.ReloadAsync();
        await WaitUntilReady();
        await Expect(html).ToHaveAttributeAsync("data-theme", "light");
    }

    [Test]
    public async Task Slash_key_opens_search()
    {
        await Open("#/");
        await Expect(SearchDialog).ToBeHiddenAsync();
        await Page.Keyboard.PressAsync("/");
        await Expect(SearchDialog).ToBeVisibleAsync();
        await Expect(SearchInput).ToBeFocusedAsync();
    }

    [Test]
    public async Task Malformed_link_does_not_hang_on_the_splash()
    {
        await Open("#/person/%E0%A4");
        await Expect(Page.Locator("#splash")).ToBeHiddenAsync();
        await Expect(Sheet.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("We could not find that person");
    }
}

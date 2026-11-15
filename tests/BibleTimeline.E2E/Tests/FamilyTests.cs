using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class FamilyTests : E2ETest
{
    ILocator Names => Page.GetByRole(AriaRole.Heading, new() { Level = 3 });

    [Test]
    public async Task Line_runs_from_Adam_to_Jesus_beginning_with_Adam()
    {
        await Open("#/family");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("From Adam to");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("Jesus");
        await Expect(Names.First).ToHaveTextAsync("Adam");
    }

    [Test]
    public async Task Switching_to_Lukes_line_changes_the_names_shown()
    {
        await Open("#/family");
        await Expect(Names.First).ToHaveTextAsync("Adam");
        var before = await Names.AllInnerTextsAsync();

        await Page.GetByRole(AriaRole.Link, new() { Name = "Luke’s line" }).ClickAsync();
        await ExpectHash("/family\\?.*line=luke");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Luke’s line" })).ToHaveAttributeAsync("aria-current", "true");
        await Expect(Page.GetByRole(AriaRole.Link, new() { Name = "Matthew’s line" })).Not.ToHaveAttributeAsync("aria-current", "true");
        await Expect(Names.First).ToHaveTextAsync("Adam");
        var after = await Names.AllInnerTextsAsync();
        Assert.That(after, Is.Not.EqualTo(before), "Luke's genealogy names different ancestors from Matthew's");
    }

    [Test]
    public async Task Family_tree_shows_Jacob_with_his_parents_and_children()
    {
        await Open("#/family/jacob");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Jacob", Exact = true })).ToBeVisibleAsync();
        var relatives = await Eval<System.Text.Json.JsonElement>(
            "(() => { const j = Store.person('jacob'); return { parents: Store.parents(j).map(p => p.name), children: Store.children(j).map(p => p.name) }; })()");
        var parents = relatives.GetProperty("parents").EnumerateArray().Select(e => e.GetString()!).ToList();
        var children = relatives.GetProperty("children").EnumerateArray().Select(e => e.GetString()!).ToList();
        Assert.That(parents, Is.Not.Empty);
        Assert.That(children, Is.Not.Empty);
        foreach (var name in parents.Concat(children).Take(6))
            await Expect(Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex(Regex.Escape(name) + @",") }).First).ToBeVisibleAsync();
    }

    [Test]
    public async Task Clicking_a_relative_recentres_the_tree()
    {
        await Open("#/family/jacob");
        var child = await Eval<string>("Store.children(Store.person('jacob'))[0].name");
        var slug = await Eval<string>("Store.children(Store.person('jacob'))[0].slug");
        await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Child: " + Regex.Escape(child) + ",") }).ClickAsync();
        await ExpectHash("/family/" + Regex.Escape(slug));
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = child, Exact = true })).ToBeVisibleAsync();
    }

    [Test]
    public async Task Searching_for_Moses_opens_his_tree_with_parents_and_sons()
    {
        await Open("#/family");
        var search = Page.GetByRole(AriaRole.Combobox, new() { Name = "Find a person’s family tree" });
        await search.FillAsync("moses");
        await Expect(Page.GetByRole(AriaRole.Option).First).ToContainTextAsync("Moses");
        await search.PressAsync("Enter");
        await ExpectHash("/family/moses");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Moses", Exact = true })).ToBeVisibleAsync();
        foreach (var name in new[] { "Amram", "Jochebed", "Gershom" })
            await Expect(Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex(Regex.Escape(name) + ",") }).First).ToBeAttachedAsync();
    }
}

public class FamilyPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Family_search_is_available_on_a_phone_in_line_of_descent()
    {
        await Open("#/family");
        var search = Page.GetByRole(AriaRole.Combobox, new() { Name = "Find a person’s family tree" });
        await Expect(search).ToBeVisibleAsync();
        await search.FillAsync("moses");
        await Page.GetByRole(AriaRole.Option).First.TapAsync();
        await ExpectHash("/family/moses");
    }
}

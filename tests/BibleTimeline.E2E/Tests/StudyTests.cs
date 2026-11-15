using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class StudyTests : E2ETest
{
    private ILocator Panel => Page.Locator("#study-panel");
    private ILocator PanelTitle => Panel.Locator("#sp-title");
    private ILocator CrossRefs => Panel.Locator(".sp-sec[data-section='xrefs']");

    [Test]
    public async Task Study_button_in_the_selection_bar_opens_the_panel_beside_the_text()
    {
        await Open("#/read/john/3");
        await Page.Locator(".verse[data-v='16']").ClickAsync();
        await Page.GetByRole(AriaRole.Region, new() { Name = "Selected verses" })
            .GetByRole(AriaRole.Button, new() { Name = "Study" }).ClickAsync();

        await Expect(PanelTitle).ToHaveTextAsync("John 3:16");
        await Expect(Panel.Locator(".sp-verse")).ToContainTextAsync("For God so loved the world");
        await ExpectHash(@"/read/john/3\?study=16$");

        // The panel docks to the right and the reader's text stays clear of it.
        var panel = await SettledBox(Panel);
        var text = await Page.Locator(".read-text").BoundingBoxAsync();
        Assert.That(panel.X + panel.Width, Is.EqualTo(1280).Within(2), "the panel is docked to the right edge");
        Assert.That(text!.X + text.Width, Is.LessThanOrEqualTo(panel.X + 1), "the text is not covered by the panel");
        await Expect(Page.Locator(".verse[data-v='16']")).ToHaveClassAsync(new Regex(@"\bis-studied\b"));
    }

    [Test]
    public async Task Cross_references_for_John_3_16_link_to_the_reader()
    {
        await Open("#/read/john/3?study=16");
        await Expect(PanelTitle).ToHaveTextAsync("John 3:16");
        await Expect(CrossRefs.Locator(".sp-sec-title")).ToHaveTextAsync("Cross-references");

        var first = CrossRefs.Locator("a.sp-row").First;
        await Expect(first.Locator(".sp-row-ref")).ToHaveTextAsync("Romans 5:8");
        await Expect(first.Locator(".sp-row-text")).ToContainTextAsync("while we were still sinners");

        // The rest wait behind "Show all".
        var visibleBefore = await CrossRefs.Locator("li:visible").CountAsync();
        await CrossRefs.GetByRole(AriaRole.Button, new() { NameRegex = new Regex(@"^Show all \d+$") }).ClickAsync();
        Assert.That(await CrossRefs.Locator("li:visible").CountAsync(), Is.GreaterThan(visibleBefore));
        await Expect(CrossRefs.Locator("a.sp-row", new() { HasText = "1 John 4:9–10" })).ToBeVisibleAsync();

        await first.ClickAsync();
        await ExpectHash(@"/read/romans/5\?v=8$");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^Romans\s*5$"));
        await Expect(Page.Locator(".verse[data-v='8']")).ToHaveClassAsync(new Regex(@"\bis-hl\b"));
        await Expect(Panel).ToBeHiddenAsync();

        // Back returns to the study, still open on John 3:16.
        await Page.GoBackAsync();
        await Expect(PanelTitle).ToHaveTextAsync("John 3:16");
    }

    [Test]
    public async Task Next_and_previous_verse_move_the_study_and_Escape_closes_it()
    {
        await Open("#/read/john/3?study=16");
        await Expect(PanelTitle).ToHaveTextAsync("John 3:16");

        await Panel.GetByRole(AriaRole.Button, new() { Name = "Next verse" }).ClickAsync();
        await Expect(PanelTitle).ToHaveTextAsync("John 3:17");
        await Expect(Panel.Locator(".sp-verse")).ToContainTextAsync("not send his Son into the world to condemn");
        await ExpectHash(@"/read/john/3\?study=17$");

        await Panel.GetByRole(AriaRole.Button, new() { Name = "Previous verse" }).ClickAsync();
        await Panel.GetByRole(AriaRole.Button, new() { Name = "Previous verse" }).ClickAsync();
        await Expect(PanelTitle).ToHaveTextAsync("John 3:15");
        await ExpectHash(@"/read/john/3\?study=15$");

        await Page.Keyboard.PressAsync("Escape");
        await Expect(Panel).ToBeHiddenAsync();
        await ExpectHash(@"/read/john/3$");
        await Expect(Page.Locator(".verse.is-studied")).ToHaveCountAsync(0);
    }

    [Test]
    public async Task Last_verse_steps_on_into_the_next_chapter()
    {
        await Open("#/read/john/3?study=36");
        await Expect(PanelTitle).ToHaveTextAsync("John 3:36");
        await Panel.GetByRole(AriaRole.Button, new() { Name = "Next verse" }).ClickAsync();
        await ExpectHash(@"/read/john/4\?study=1$");
        await Expect(PanelTitle).ToHaveTextAsync("John 4:1");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync(new Regex(@"^John\s*4$"));
    }

    [Test]
    public async Task Hub_introduces_each_tool_and_links_to_it()
    {
        await Open("#/study");
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToContainTextAsync("into the text");
        var tools = new Dictionary<string, string>
        {
            ["Search Scripture"] = "#/find",
            ["Reading plan"] = "#/plan",
            ["Kings and prophets"] = "#/kings",
            ["Parallel passages"] = "#/parallel",
            ["Quotations and prophecy"] = "#/prophecy",
            ["Word study"] = "#/word"
        };
        var view = Page.Locator("#view-study");
        foreach (var (name, href) in tools)
            await Expect(view.Locator($"a.study-card[href='{href}']")).ToContainTextAsync(name);

        await view.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("Try it with John 3:16") }).ClickAsync();
        await ExpectHash(@"/read/john/3\?study=16$");
        await Expect(PanelTitle).ToHaveTextAsync("John 3:16");
    }

    [Test]
    public async Task Library_links_to_the_study_tools()
    {
        await Open("#/read");
        await Page.GetByRole(AriaRole.Link, new() { NameRegex = new Regex("^Study tools") }).ClickAsync();
        await ExpectHash("/study$");
        await Expect(PrimaryNav.GetByRole(AriaRole.Link, new() { Name = "Study" })).ToHaveAttributeAsync("aria-current", "page");
    }
}

public class StudyPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Study_opens_as_a_bottom_sheet_that_leaves_the_verse_in_view()
    {
        await Open("#/read/psalms/23?study=1");
        var panel = Page.Locator("#study-panel");
        await Expect(panel.Locator("#sp-title")).ToHaveTextAsync("Psalms 23:1");
        var box = await SettledBox(panel);
        Assert.That(box.Y, Is.GreaterThan(200), "a bottom sheet leaves the text above it showing");
        Assert.That(box.Y, Is.LessThan(844 - 150), "and is on screen");
        Assert.That(box.Width, Is.GreaterThan(380), "and spans the screen");

        var verse = await Page.Locator(".verse[data-v='1']").BoundingBoxAsync();
        Assert.That(verse!.Y, Is.LessThan(box.Y), "the studied verse shows above the sheet");

        await Expect(panel.Locator(".sp-sec[data-section='xrefs'] a.sp-row").First).ToBeVisibleAsync();
        await panel.GetByRole(AriaRole.Button, new() { Name = "Close study" }).TapAsync();
        await Expect(panel).ToBeHiddenAsync();
        await ExpectHash(@"/read/psalms/23$");
    }
}

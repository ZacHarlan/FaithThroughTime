using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

/// <summary>
/// The reader in depth: where a chapter stands in history, names in the text you can tap, the reading
/// settings (text size, name links, comparing translations) and the library's "About" links.
/// </summary>
public class ReaderDepthTests : E2ETest
{
    ILocator Strip => Page.Locator(".read-hist");
    ILocator Text => Page.Locator(".read-text");
    ILocator SettingsButton => Page.GetByRole(AriaRole.Button, new() { Name = "Reading settings" });
    ILocator Settings => Page.GetByRole(AriaRole.Dialog, new() { Name = "Reading settings" });

    Task<double> TextSize() => Text.EvaluateAsync<double>("e => parseFloat(getComputedStyle(e).fontSize)");

    // Reduced motion still runs a near-instant transition, so wait for the size to settle above a bound.
    Task TextLargerThan(double px) => Page.WaitForFunctionAsync(
        "px => { const t = document.querySelector('.read-text'); return t && parseFloat(getComputedStyle(t).fontSize) > px; }", px);

    [Test]
    public async Task Strip_on_2_Kings_19_names_Hezekiah_and_Isaiah_and_links_to_the_chart()
    {
        await Open("#/read/2-kings/19");
        await Expect(Strip).ToBeVisibleAsync();
        await Expect(Strip).ToContainTextAsync("713 BC");
        await Expect(Strip.Locator(".read-hist-era")).Not.ToBeEmptyAsync();
        await Expect(Strip.GetByRole(AriaRole.Link, new() { Name = "About 2 Kings" })).ToHaveAttributeAsync("href", "#/book/2-kings");
        await Expect(Strip.Locator("a.read-hist-when")).ToHaveAttributeAsync("href", new Regex(@"^#/timeline\?y=-713"));

        var hezekiah = Strip.GetByRole(AriaRole.Link, new() { Name = "Hezekiah", Exact = true });
        var isaiah = Strip.GetByRole(AriaRole.Link, new() { Name = "Isaiah", Exact = true });
        await Expect(hezekiah).ToHaveAttributeAsync("href", "#/kings?sel=hezekiah");
        await Expect(isaiah).ToHaveAttributeAsync("href", "#/kings?sel=isaiah");
        await Expect(Strip.Locator(".read-hist-reign")).ToContainTextAsync("Judah");

        await hezekiah.ClickAsync();
        await ExpectHash(@"/kings\?sel=hezekiah$");
    }

    [Test]
    public async Task Genesis_12_names_Abram_and_a_place_that_open_without_selecting_the_verse()
    {
        await Open("#/read/genesis/12");
        var abram = Text.Locator("a.read-name.is-person", new() { HasTextRegex = new Regex("^Abra(m|ham)$") }).First;
        await Expect(abram).ToHaveAttributeAsync("href", "#/person/abraham");
        var place = Text.Locator("a.read-name.is-location").First;
        await Expect(place).ToHaveAttributeAsync("href", new Regex(@"^#/place/[a-z0-9-]+$"));
        await Expect(Text.Locator("a.read-name.is-location", new() { HasText = "Bethel" }).First).ToBeVisibleAsync();

        // Tapping a name opens the person; it does not pick the verse.
        await abram.ClickAsync();
        await ExpectHash("/person/abraham");
        await Expect(Sheet.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("Abraham");
        await Expect(Page.Locator(".verse.is-picked")).ToHaveCountAsync(0);

        // Tapping elsewhere in a verse still selects it.
        await Page.Keyboard.PressAsync("Escape");
        await ExpectHash("/read/genesis/12$");
        await Page.Locator(".verse[data-v='2']").ClickAsync();
        await Expect(Page.Locator(".verse[data-v='2']")).ToHaveClassAsync(new Regex(@"\bis-picked\b"));
    }

    [Test]
    public async Task Text_size_persists_across_chapters()
    {
        await Open("#/read/john/3");
        await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();
        var standard = await TextSize();

        await SettingsButton.ClickAsync();
        await Settings.GetByRole(AriaRole.Button, new() { Name = "Largest" }).ClickAsync();
        await Expect(Settings.GetByRole(AriaRole.Button, new() { Name = "Largest" })).ToHaveAttributeAsync("aria-pressed", "true");
        await TextLargerThan(standard * 1.2);                                       // the text grows at once

        await Page.Keyboard.PressAsync("Escape");
        await Page.GetByLabel("Next chapter").First.ClickAsync();
        await ExpectHash("/read/john/4");
        await Expect(Page.Locator(".verse[data-v='1']")).ToBeVisibleAsync();
        await TextLargerThan(standard * 1.2);                                       // the next chapter keeps the size

        await Open("#/read/romans/8");
        await Expect(Page.Locator(".verse[data-v='1']")).ToBeVisibleAsync();
        await TextLargerThan(standard * 1.2);                                       // and so does a fresh visit
        await SettingsButton.ClickAsync();
        await Expect(Settings.GetByRole(AriaRole.Button, new() { Name = "Largest" })).ToHaveAttributeAsync("aria-pressed", "true");
    }

    [Test]
    public async Task Compare_shows_two_translations_of_John_3_16_side_by_side()
    {
        await Open("#/read/john/3");
        await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();
        await SettingsButton.ClickAsync();
        await Settings.GetByLabel("Compare with").SelectOptionAsync("niv");

        var pair = Page.Locator(".read-pair[data-v='16']");
        await Expect(pair.Locator(".verse")).ToContainTextAsync("he gave his only Son");      // ESV
        await Expect(pair.Locator(".read-alt")).ToContainTextAsync("his one and only Son");   // NIV
        await Expect(Page.Locator(".read-attrib")).ToContainTextAsync("compared with the New International Version");

        var left = await pair.Locator(".verse").BoundingBoxAsync();
        var right = await pair.Locator(".read-alt").BoundingBoxAsync();
        Assert.That(right!.X, Is.GreaterThan(left!.X + left.Width - 2), "on a wide screen the translations sit in two columns");
        Assert.That(Math.Abs(right.Y - left.Y), Is.LessThan(4), "verse by verse");

        // Selecting a verse still works, and the choice is remembered.
        await pair.Locator(".verse").ClickAsync();
        await Expect(Page.Locator(".verse[data-v='16']")).ToHaveClassAsync(new Regex(@"\bis-picked\b"));
        await Open("#/read/john/4");
        await Expect(Page.Locator(".read-pair[data-v='1'] .read-alt")).ToBeVisibleAsync();
    }

    [Test]
    public async Task Name_links_can_be_turned_off()
    {
        await Open("#/read/genesis/12");
        await Expect(Text.Locator("a.read-name").First).ToBeVisibleAsync();
        await SettingsButton.ClickAsync();
        var names = Settings.GetByRole(AriaRole.Switch, new() { NameRegex = new Regex("^Names as links") });
        await Expect(names).ToHaveAttributeAsync("aria-checked", "true");
        await names.ClickAsync();
        await Expect(names).ToHaveAttributeAsync("aria-checked", "false");
        await Expect(Text.Locator("a.read-name")).ToHaveCountAsync(0);
        await Expect(Text).ToContainTextAsync("Now the LORD said to Abram");

        await Open("#/read/genesis/13");
        await Expect(Page.Locator(".verse[data-v='1']")).ToBeVisibleAsync();
        await Expect(Text.Locator("a.read-name")).ToHaveCountAsync(0);
    }

    // A stand-in for the browser's speech engine: it records what it is asked to say and finishes an
    // utterance only when the test says so, so the run is the same on every machine.
    const string FakeSpeech = @"(() => {
        const fake = {
            spoken: [], current: null, paused: false, speaking: false,
            getVoices: () => [{ lang: 'en-US', localService: true, name: 'Test voice' }],
            speak(u) { this.spoken.push(u.text); this.current = u; this.speaking = true; },
            pause() { this.paused = true; },
            resume() { this.paused = false; },
            cancel() { const u = this.current; this.current = null; this.speaking = false; if (u && u.onerror) u.onerror({ error: 'canceled' }); },
            finish() { const u = this.current; this.current = null; if (u && u.onend) u.onend({}); }
        };
        Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
        window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    })()";

    [Test]
    public async Task Listen_reads_verse_by_verse_pauses_and_stops_on_leaving_the_chapter()
    {
        await Page.AddInitScriptAsync(FakeSpeech);
        await Open("#/read/john/3");
        await Expect(Page.GetByText("For God so loved the world").First).ToBeVisibleAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Listen" }).ClickAsync();
        var bar = Page.GetByRole(AriaRole.Region, new() { Name = "Reading aloud" });
        await Expect(bar).ToContainTextAsync("Reading verse 1 of 36");
        await Expect(Page.Locator(".verse[data-v='1']")).ToHaveClassAsync(new Regex(@"\bis-reading\b"));
        Assert.That(await Eval<string>("speechSynthesis.spoken[0]"), Does.StartWith("Now there was a man of the Pharisees"));

        await Page.EvaluateAsync("speechSynthesis.finish()");
        await Expect(bar).ToContainTextAsync("Reading verse 2 of 36");
        await Expect(Page.Locator(".verse.is-reading")).ToHaveAttributeAsync("data-v", "2");

        await bar.GetByRole(AriaRole.Button, new() { Name = "Pause" }).ClickAsync();
        await Expect(bar).ToContainTextAsync("Paused");
        Assert.That(await Eval<bool>("speechSynthesis.paused"), Is.True);
        await bar.GetByRole(AriaRole.Button, new() { Name = "Resume" }).ClickAsync();
        Assert.That(await Eval<bool>("speechSynthesis.paused"), Is.False);

        await Page.GetByLabel("Next chapter").First.ClickAsync();
        await ExpectHash("/read/john/4");
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "Reading aloud" })).ToBeHiddenAsync();
        await Expect(Page.Locator(".verse.is-reading")).ToHaveCountAsync(0);
        Assert.That(await Eval<bool>("speechSynthesis.speaking"), Is.False, "speech stops on leaving the chapter");
    }

    [Test]
    public async Task Library_row_starts_reading_and_About_opens_the_book_page()
    {
        await Open("#/read");
        var row = Page.Locator(".read-book-item", new() { Has = Page.Locator(".read-book-name", new() { HasTextString = "Genesis" }) }).First;
        await Expect(row.Locator("a.read-book")).ToHaveAttributeAsync("href", "#/read/genesis/1");
        await Expect(row.GetByRole(AriaRole.Link, new() { Name = "About Genesis" })).ToHaveAttributeAsync("href", "#/book/genesis");
        await row.Locator("a.read-book").ClickAsync();
        await ExpectHash("/read/genesis/1$");
    }
}

public class ReaderDepthPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Phone_shows_the_strip_tappable_names_settings_and_stacked_comparison()
    {
        await Open("#/read/genesis/12");
        var strip = Page.Locator(".read-hist");
        await Expect(strip).ToBeVisibleAsync();
        var box = await strip.BoundingBoxAsync();
        Assert.That(box!.X + box.Width, Is.LessThanOrEqualTo(390), "the strip fits the screen");
        Assert.That(await Eval<int>("document.querySelector('#view-read').scrollWidth"), Is.LessThanOrEqualTo(390), "no sideways scroll");

        // Settings rise from the bottom and fit the screen.
        await Page.GetByRole(AriaRole.Button, new() { Name = "Reading settings" }).TapAsync();
        var settings = Page.GetByRole(AriaRole.Dialog, new() { Name = "Reading settings" });
        await Expect(settings).ToBeVisibleAsync();
        var pop = await settings.BoundingBoxAsync();
        Assert.That(pop!.X, Is.GreaterThanOrEqualTo(0));
        Assert.That(pop.X + pop.Width, Is.LessThanOrEqualTo(390));
        Assert.That(pop.Y + pop.Height, Is.LessThanOrEqualTo(844));
        await settings.GetByLabel("Compare with").SelectOptionAsync("kjv");

        // Stacked: the second translation sits under its verse.
        var pair = Page.Locator(".read-pair[data-v='1']");
        await Expect(pair.Locator(".read-alt")).ToContainTextAsync("Get thee out of thy country");
        var verse = await pair.Locator(".verse").BoundingBoxAsync();
        var alt = await pair.Locator(".read-alt").BoundingBoxAsync();
        Assert.That(alt!.Y, Is.GreaterThan(verse!.Y + verse.Height / 2), "on a phone the translations stack");
        Assert.That(alt.X, Is.LessThan(verse.X + 40), "one under the other");

        // A name still opens its sheet.
        await Page.Locator("a.read-name.is-person", new() { HasTextString = "Abram" }).First.TapAsync();
        await ExpectHash("/person/abraham");
        await Expect(Sheet).ToBeVisibleAsync();
    }
}

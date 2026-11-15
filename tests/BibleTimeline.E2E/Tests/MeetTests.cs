using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class MeetTests : E2ETest
{
    ILocator Verdict => Page.GetByRole(AriaRole.Heading, new() { Level = 1 });
    ILocator First => Page.GetByLabel("First person");
    ILocator Second => Page.GetByLabel("Second person");

    [Test]
    public async Task Noah_and_Abraham_missed_each_other()
    {
        await Open("#/meet/noah/abraham");
        await Expect(Verdict).ToContainTextAsync("missed each other");
        await Expect(Verdict).ToContainTextAsync(await OverlapPhrase("noah", "abraham"));
        await Expect(First).ToHaveValueAsync("Noah");
        await Expect(Second).ToHaveValueAsync("Abraham");
    }

    [Test]
    public async Task Methuselah_and_Noah_overlapped_for_the_computed_number_of_years()
    {
        await Open("#/meet/methuselah/noah");
        var overlap = await Eval<System.Text.Json.JsonElement>(
            "(() => { const r = Store.overlap(Store.person('methuselah'), Store.person('noah')); return { overlaps: r.overlaps, text: Time.years(r.years) }; })()");
        Assert.That(overlap.GetProperty("overlaps").GetBoolean(), Is.True, "the data should have them overlap");
        await Expect(Verdict).ToContainTextAsync("overlapped for");
        await Expect(Verdict).ToContainTextAsync(overlap.GetProperty("text").GetString()!);
    }

    [Test]
    public async Task Swap_control_swaps_the_two_people()
    {
        await Open("#/meet/noah/abraham");
        await Page.GetByRole(AriaRole.Button, new() { Name = "Swap the two people" }).ClickAsync();
        await ExpectHash("/meet/abraham/noah");
        await Expect(First).ToHaveValueAsync("Abraham");
        await Expect(Second).ToHaveValueAsync("Noah");
    }

    [Test]
    public async Task Choosing_a_person_in_the_picker_updates_the_url()
    {
        await Open("#/meet/noah");
        await Second.FillAsync("abraham");
        var options = Page.GetByRole(AriaRole.Listbox, new() { Name = "Suggestions" }).GetByRole(AriaRole.Option);
        await Expect(options.First).ToContainTextAsync("Abraham");
        await options.First.ClickAsync();
        await ExpectHash("/meet/noah/abraham");
        await Expect(Verdict).ToContainTextAsync("missed each other");
    }

    [Test]
    public async Task A_pair_with_an_unrecorded_date_says_it_cannot_say()
    {
        await Open("#/");
        var pair = await Eval<string[]>(
            "(() => { const known = Store.people.find(p => Store.datesKnown(p)); " +
            "const unknown = Store.people.find(p => !Store.datesKnown(p)); " +
            "return unknown ? [known.slug, unknown.slug] : []; })()");
        if (pair.Length == 0) Assert.Inconclusive("Every person in the data has recorded dates.");
        await NavigateTo($"#/meet/{pair[0]}/{pair[1]}");
        await Expect(Verdict).ToContainTextAsync(new Regex("We can.t say"));
    }
}

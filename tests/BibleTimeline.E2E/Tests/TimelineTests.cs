using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class TimelineTests : E2ETest
{
    // The whole story, in years, as the app measures it.
    Task<double> WholeSpan() => Eval<double>("Time.between(Time.MIN, Time.MAX)");

    [Test]
    public async Task Opens_on_the_whole_story()
    {
        await Open("#/timeline");
        await Expect(TimelineCanvas).ToBeVisibleAsync();
        var (_, span) = await TimelineView();
        var whole = await WholeSpan();
        Assert.That(span, Is.InRange(whole * 0.95, whole * 1.2), "the opening view should fit all of history");
    }

    [Test]
    public async Task Era_query_narrows_the_view_to_that_era()
    {
        await Open("#/timeline");
        // Pick the Patriarchs (or the second period) from the app's own data.
        var era = await Eval<System.Text.Json.JsonElement>(
            "(() => { const p = Store.periods.find(x => /patriarch/i.test(x.slug)) || Store.periods[1]; " +
            "return { slug: p.slug, start: p.startYear, end: p.endYear, length: Time.between(p.startYear, p.endYear) }; })()");
        var slug = era.GetProperty("slug").GetString()!;
        var length = era.GetProperty("length").GetDouble();
        var start = era.GetProperty("start").GetInt32();
        var end = era.GetProperty("end").GetInt32();

        await Open($"#/timeline?era={slug}");
        var (year, span) = await TimelineView();
        var whole = await WholeSpan();
        Assert.That(span, Is.LessThan(whole * 0.5), "an era is a small part of the story");
        Assert.That(span, Is.InRange(length * 0.95, length * 1.4), "the view should frame the era with a little air");
        var lo = Math.Min(start, end) - 1; var hi = Math.Max(start, end) + 1;
        Assert.That(year, Is.InRange(lo, hi), "the view should be centred inside the era");
    }

    [Test]
    public async Task Zoom_in_key_reduces_the_visible_span()
    {
        await Open("#/timeline");
        var (_, before) = await TimelineView();
        await TimelineCanvas.FocusAsync();
        await Page.Keyboard.PressAsync("+");
        var (_, after) = await TimelineView();
        Assert.That(after, Is.LessThan(before));
    }

    [Test]
    public async Task Interacting_writes_year_and_span_to_the_url()
    {
        await Open("#/timeline");
        await TimelineCanvas.FocusAsync();
        await Page.Keyboard.PressAsync("+");
        await Expect(Page).ToHaveURLAsync(new Regex(@"#/timeline\?(?=.*\by=-?\d)(?=.*\bspan=\d)"));
    }

    [Test]
    public async Task Person_sheet_opens_over_the_timeline_and_closing_returns_to_the_same_url()
    {
        await Open("#/");
        await NavigateTo("#/timeline?y=-1000&span=900");
        await Expect(TimelineCanvas).ToBeVisibleAsync();
        await Expect(Page).ToHaveURLAsync(new Regex(@"#/timeline\?"));
        var timelineUrl = Page.Url;

        await NavigateTo("#/person/david");
        await Expect(Sheet.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToHaveTextAsync("David");
        await Expect(TimelineCanvas).ToBeVisibleAsync();   // still there underneath

        await Sheet.GetByRole(AriaRole.Button, new() { Name = "Close details" }).ClickAsync();
        await Expect(Sheet).ToBeHiddenAsync();
        await Expect(Page).ToHaveURLAsync(timelineUrl);
    }

    [Test]
    public async Task Back_after_closing_the_sheet_does_not_reopen_it()
    {
        await Open("#/");
        await NavigateTo("#/timeline?y=-1000&span=900");
        await Expect(Page).ToHaveURLAsync(new Regex(@"#/timeline\?"));
        await NavigateTo("#/person/david");
        await Expect(Sheet).ToBeVisibleAsync();
        await Sheet.GetByRole(AriaRole.Button, new() { Name = "Close details" }).ClickAsync();
        await Expect(Sheet).ToBeHiddenAsync();

        await Page.GoBackAsync();
        await Expect(Page).Not.ToHaveURLAsync(new Regex("/person/"));
        await Expect(Sheet).ToBeHiddenAsync();
    }
}

using System.Text.RegularExpressions;
using BibleTimeline.E2E.Support;
using Microsoft.Playwright;
using static Microsoft.Playwright.Assertions;

namespace BibleTimeline.E2E.Tests;

public class PrintTests : E2ETest
{
    const string Scratch = "/private/tmp/claude-501/-Users-zacharlan-Documents-FaithThroughTime/ab032214-1a6c-4d5e-8670-d2c69eb6ad79/scratchpad/print";

    Task Print() => Page.EmulateMediaAsync(new() { Media = Media.Print });

    async Task<string> Display(string selector) =>
        await Page.EvaluateAsync<string>("s => getComputedStyle(document.querySelector(s)).display", selector);

    [Test]
    public async Task Reader_chapter_prints_without_chrome_and_flows()
    {
        await Open("#/read/psalms/119");
        await Expect(Page.Locator(".read-text .verse").First).ToBeVisibleAsync();
        await Print();
        Assert.That(await Display(".topbar"), Is.EqualTo("none"));
        Assert.That(await Display(".tabbar"), Is.EqualTo("none"));
        await Expect(Page.Locator(".read-text .verse").First).ToBeVisibleAsync();
        await Expect(Page.Locator(".read-text .verse button.vn").First).ToBeVisibleAsync();
        await Expect(Page.Locator(".read-attrib")).ToBeVisibleAsync();
        await Expect(Page.Locator(".read-pager")).ToBeHiddenAsync();
        Assert.That(await Page.EvaluateAsync<string>("() => getComputedStyle(document.querySelector('#view-read')).position"), Is.EqualTo("static"));
        Assert.That(await Page.EvaluateAsync<bool>("() => document.querySelector('#view-read').getBoundingClientRect().height > innerHeight"), Is.True);
        Assert.That(await Page.EvaluateAsync<string>("() => getComputedStyle(document.body).backgroundColor"), Is.EqualTo("rgb(255, 255, 255)"));

        Directory.CreateDirectory(Scratch);
        await Page.PdfAsync(new() { Path = $"{Scratch}/chapter.pdf", PreferCSSPageSize = true, DisplayHeaderFooter = false });
        Assert.That(new FileInfo($"{Scratch}/chapter.pdf").Length, Is.GreaterThan(5000));
    }

    [Test]
    public async Task Parallel_passage_prints_all_columns_side_by_side()
    {
        await Open("#/parallel/feeding-the-five-thousand");
        var cols = Page.Locator(".par-col");
        await Expect(cols).ToHaveCountAsync(4);
        await Print();
        Assert.That(await Display(".topbar"), Is.EqualTo("none"));
        Assert.That(await Display(".tabbar"), Is.EqualTo("none"));
        Assert.That(await Display(".par-tools"), Is.EqualTo("none"));
        for (var i = 0; i < 4; i++)
        {
            await Expect(cols.Nth(i)).ToBeVisibleAsync();
            await Expect(cols.Nth(i).Locator(".par-ref")).ToBeVisibleAsync();
            Assert.That((await cols.Nth(i).Locator(".par-text").InnerTextAsync()).Length, Is.GreaterThan(80));
        }
        var a = await cols.Nth(0).BoundingBoxAsync();
        var b = await cols.Nth(1).BoundingBoxAsync();
        Assert.That(b!.X, Is.GreaterThan(a!.X + 50), "columns sit side by side");
        Assert.That(await Page.EvaluateAsync<string>("() => getComputedStyle(document.querySelector('#view-parallel')).position"), Is.EqualTo("static"));

        Directory.CreateDirectory(Scratch);
        await Page.PdfAsync(new() { Path = $"{Scratch}/parallel.pdf", PreferCSSPageSize = true, Landscape = true });
        Assert.That(new FileInfo($"{Scratch}/parallel.pdf").Length, Is.GreaterThan(5000));
    }

    [Test]
    public async Task Prophecy_pair_prints_both_passages()
    {
        await Open("#/prophecy/born-in-bethlehem");
        await Expect(Page.Locator(".pr-verse").First).ToBeVisibleAsync();
        await Print();
        Assert.That(await Display(".topbar"), Is.EqualTo("none"));
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "The prophecy" })).ToContainTextAsync("Ephrat");
        await Expect(Page.GetByRole(AriaRole.Region, new() { Name = "The fulfilment" })).ToContainTextAsync("Herod");
        await Expect(Page.Locator(".pr-pager")).ToBeHiddenAsync();
    }

    [Test]
    public async Task Print_and_Share_exist_on_parallel_prophecy_and_plan_pages()
    {
        foreach (var route in new[] { "#/parallel/feeding-the-five-thousand", "#/prophecy/born-in-bethlehem", "#/plan/1" })
        {
            await Open(route);
            await Expect(Page.Locator(".view:not([hidden]) button[data-act=print]")).ToBeVisibleAsync();
            await Expect(Page.Locator(".view:not([hidden]) button[data-act=share]")).ToBeVisibleAsync();
        }
    }

    [Test]
    public async Task Share_copies_a_link()
    {
        await Context.GrantPermissionsAsync(new[] { "clipboard-read", "clipboard-write" });
        await Open("#/plan/1");
        await Page.Locator(".view:not([hidden]) button[data-act=share]").ClickAsync();
        await Expect(Page.Locator("#toast")).ToContainTextAsync("Link copied");
        var text = await Page.EvaluateAsync<string>("() => navigator.clipboard.readText()");
        Assert.That(text, Does.Contain("#/plan/1"));
    }

    [Test]
    public async Task Plan_day_prints_its_passages()
    {
        await Open("#/plan/1");
        await Expect(Page.Locator(".plan-passage").First).ToBeVisibleAsync();
        await Print();
        Assert.That(await Display(".topbar"), Is.EqualTo("none"));
        await Expect(Page.Locator(".plan-passage").First).ToBeVisibleAsync();
        await Expect(Page.Locator(".plan-year")).ToBeHiddenAsync();
    }
}

public class PrintPhoneTests : E2ETest
{
    protected override bool Phone => true;

    [Test]
    public async Task Parallel_passage_prints_every_column_even_on_a_phone()
    {
        await Open("#/parallel/feeding-the-five-thousand");
        await Expect(Page.Locator(".par-col.is-active")).ToHaveCountAsync(1);
        await Page.EmulateMediaAsync(new() { Media = Media.Print });
        for (var i = 0; i < 4; i++) await Expect(Page.Locator(".par-col").Nth(i)).ToBeVisibleAsync();
        await Expect(Page.Locator(".tabbar")).ToBeHiddenAsync();
    }
}

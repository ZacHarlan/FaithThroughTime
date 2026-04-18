using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using BibleTimeline.Web.Models;

namespace BibleTimeline.Tests;

public class TimelineEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TimelineEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetTimeline_ReturnsItems()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>("/api/timeline");

        Assert.NotNull(items);
        Assert.NotEmpty(items);
        Assert.Contains(items, i => i.Type == "person");
        Assert.Contains(items, i => i.Type == "event");
    }

    [Fact]
    public async Task GetTimeline_FilterBySignificance_ReturnsMajorOnly()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>(
            "/api/timeline?significance=major");

        Assert.NotNull(items);
        Assert.All(items, i => Assert.Equal("major", i.Significance));
    }

    [Fact]
    public async Task GetTimeline_FilterByRole_ReturnsOnlyMatchingRole()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>(
            "/api/timeline?role=king&includeEvents=false");

        Assert.NotNull(items);
        Assert.NotEmpty(items);
        Assert.All(items, i =>
        {
            Assert.Equal("person", i.Type);
            Assert.Equal("king", i.Category);
        });
    }

    [Fact]
    public async Task GetTimeline_FilterPeopleOnly()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>(
            "/api/timeline?includeEvents=false");

        Assert.NotNull(items);
        Assert.All(items, i => Assert.Equal("person", i.Type));
    }

    [Fact]
    public async Task GetTimeline_FilterEventsOnly()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>(
            "/api/timeline?includePeople=false");

        Assert.NotNull(items);
        Assert.All(items, i => Assert.Equal("event", i.Type));
    }

    [Fact]
    public async Task GetTimeline_FilterByCategory()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>(
            "/api/timeline?category=covenant&includePeople=false");

        Assert.NotNull(items);
        Assert.NotEmpty(items);
        Assert.All(items, i => Assert.Equal("covenant", i.Category));
    }

    [Fact]
    public async Task GetTimeline_FilterByPeriod()
    {
        var items = await _client.GetFromJsonAsync<List<TimelineItemDto>>(
            "/api/timeline?period=Life+of+Christ");

        Assert.NotNull(items);
        Assert.NotEmpty(items);
    }

    [Fact]
    public async Task GetPeriods_ReturnsAllPeriods()
    {
        var periods = await _client.GetFromJsonAsync<List<TimePeriod>>("/api/timeline/periods");

        Assert.NotNull(periods);
        Assert.NotEmpty(periods);
        Assert.Contains(periods, p => p.Name == "Patriarchs");
        Assert.Contains(periods, p => p.Name == "Life of Christ");
        // Verify ordering
        for (int i = 1; i < periods.Count; i++)
        {
            Assert.True(periods[i].SortOrder >= periods[i - 1].SortOrder);
        }
    }

    [Fact]
    public async Task GetBooks_ReturnsAllBooks()
    {
        var books = await _client.GetFromJsonAsync<List<BiblicalBook>>("/api/timeline/books");

        Assert.NotNull(books);
        Assert.True(books.Count >= 66); // At least all 66 books of the Bible
        Assert.Contains(books, b => b.Name == "Genesis");
        Assert.Contains(books, b => b.Name == "Revelation");
    }

    [Fact]
    public async Task GetFilters_ReturnsValidOptions()
    {
        var options = await _client.GetFromJsonAsync<FilterOptionsDto>("/api/timeline/filters");

        Assert.NotNull(options);
        Assert.NotEmpty(options.Roles);
        Assert.NotEmpty(options.EventCategories);
        Assert.NotEmpty(options.TimePeriods);
        Assert.Contains("king", options.Roles);
        Assert.Contains("prophet", options.Roles);
        Assert.Contains("covenant", options.EventCategories);
    }

    [Fact]
    public async Task GetFilters_ReturnsAllFieldsRequiredByFrontend()
    {
        // The frontend filters.js calls .map() on every one of these fields.
        // If any field is missing or null the UI throws "Failed to load data."
        var options = await _client.GetFromJsonAsync<FilterOptionsDto>("/api/timeline/filters");

        Assert.NotNull(options);
        Assert.NotNull(options.Roles);
        Assert.NotNull(options.EventCategories);
        Assert.NotNull(options.Tribes);
        Assert.NotNull(options.TimePeriods);
        Assert.NotNull(options.DateConfidences);
        Assert.NotNull(options.Locations);
        Assert.NotNull(options.Books);

        Assert.NotEmpty(options.DateConfidences);
        Assert.NotEmpty(options.Locations);
        Assert.NotEmpty(options.Books);

        // Verify shape of location and book options
        var loc = options.Locations.First();
        Assert.True(loc.Id > 0);
        Assert.False(string.IsNullOrEmpty(loc.Name));

        var book = options.Books.First();
        Assert.True(book.Id > 0);
        Assert.False(string.IsNullOrEmpty(book.Name));
        Assert.False(string.IsNullOrEmpty(book.Testament));
    }
}

public class PersonEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public PersonEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetPersonDetail_ExistingPerson_ReturnsDetail()
    {
        // Person ID 1 = Adam (from seed data)
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/1");

        Assert.NotNull(person);
        Assert.Equal("Adam", person.Name);
        Assert.Equal("patriarch", person.Role);
        Assert.NotNull(person.Description);
    }

    [Fact]
    public async Task GetPersonDetail_IncludesRelationships()
    {
        // David (id=20) should have Solomon as child
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/20");

        Assert.NotNull(person);
        Assert.Equal("David", person.Name);
        Assert.NotEmpty(person.Events);
        // David has relationships
        Assert.NotEmpty(person.Relationships);
    }

    [Fact]
    public async Task GetPersonDetail_IncludesEvents()
    {
        // Moses (id=10) should be connected to Exodus events
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/10");

        Assert.NotNull(person);
        Assert.Equal("Moses", person.Name);
        Assert.NotEmpty(person.Events);
        Assert.Contains(person.Events, e => e.Name.Contains("Exodus"));
    }

    [Fact]
    public async Task GetPersonDetail_NonExistent_Returns404()
    {
        var response = await _client.GetAsync("/api/people/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

public class EventEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public EventEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetEventDetail_ExistingEvent_ReturnsDetail()
    {
        // Event ID 1 = Creation
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/1");

        Assert.NotNull(evt);
        Assert.Equal("Creation", evt.Name);
        Assert.Equal("creation", evt.Category);
    }

    [Fact]
    public async Task GetEventDetail_IncludesPeople()
    {
        // Crucifixion (event 45) should reference Jesus
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/45");

        Assert.NotNull(evt);
        Assert.NotEmpty(evt.People);
    }

    [Fact]
    public async Task GetEventDetail_IncludesLocations()
    {
        // Crucifixion (event 45) should have Jerusalem
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/45");

        Assert.NotNull(evt);
        Assert.NotEmpty(evt.Locations);
        Assert.Contains(evt.Locations, l => l.Name == "Jerusalem");
    }

    [Fact]
    public async Task GetEventDetail_NonExistent_Returns404()
    {
        var response = await _client.GetAsync("/api/events/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetEventDetail_MiracleScriptureIsCorrect()
    {
        // Event 65 = Healing at Pool of Bethesda → should reference John 5:1-17
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/65");

        Assert.NotNull(evt);
        Assert.NotEmpty(evt.ScriptureReferences);
        Assert.Contains(evt.ScriptureReferences, s => s.ReferenceText.Contains("John 5"));
    }

    [Fact]
    public async Task GetPersonDetail_ScriptureIsCorrect()
    {
        // Person 1 = Adam → should reference Genesis, not a miracle ref
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/1");

        Assert.NotNull(person);
        Assert.NotEmpty(person.ScriptureReferences);
        Assert.Contains(person.ScriptureReferences, s => s.ReferenceText.Contains("Genesis"));
    }
}

public class SearchEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public SearchEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Search_FindsPeopleByName()
    {
        var results = await _client.GetFromJsonAsync<List<SearchResultDto>>(
            "/api/search?q=David");

        Assert.NotNull(results);
        Assert.Contains(results, r => r.Name == "David" && r.Type == "person");
    }

    [Fact]
    public async Task Search_FindsEventsByName()
    {
        var results = await _client.GetFromJsonAsync<List<SearchResultDto>>(
            "/api/search?q=Exodus");

        Assert.NotNull(results);
        Assert.Contains(results, r => r.Type == "event");
    }

    [Fact]
    public async Task Search_FilterByType()
    {
        var results = await _client.GetFromJsonAsync<List<SearchResultDto>>(
            "/api/search?q=David&type=person");

        Assert.NotNull(results);
        Assert.All(results, r => Assert.Equal("person", r.Type));
    }

    [Fact]
    public async Task Search_TooShort_ReturnsBadRequest()
    {
        var response = await _client.GetAsync("/api/search?q=a");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Search_PrefixMatch_Works()
    {
        var results = await _client.GetFromJsonAsync<List<SearchResultDto>>(
            "/api/search?q=Abra");

        Assert.NotNull(results);
        Assert.Contains(results, r => r.Name == "Abraham");
    }
}

public class LineageEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public LineageEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetPeopleList_ReturnsNonEmptyList()
    {
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");

        Assert.NotNull(people);
        Assert.NotEmpty(people);
        Assert.Contains(people, p => p.Name == "Adam");
        Assert.Contains(people, p => p.Name == "Abraham");
    }

    [Fact]
    public async Task GetPeopleList_SortedAlphabetically()
    {
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");

        Assert.NotNull(people);
        for (int i = 1; i < people.Count; i++)
        {
            Assert.True(string.Compare(people[i].Name, people[i - 1].Name, StringComparison.Ordinal) >= 0,
                $"'{people[i].Name}' should come after '{people[i - 1].Name}'");
        }
    }

    [Fact]
    public async Task GetPeopleList_IncludesParentIds()
    {
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");

        Assert.NotNull(people);
        var seth = people.FirstOrDefault(p => p.Name == "Seth");
        Assert.NotNull(seth);
        Assert.NotNull(seth.FatherId);
    }

    [Fact]
    public async Task GetLineage_NonExistent_Returns404()
    {
        var response = await _client.GetAsync("/api/lineage/9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetLineage_SubjectFieldsPopulated()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/1");

        Assert.NotNull(lineage);
        Assert.True(lineage.Subject.Id > 0);
        Assert.False(string.IsNullOrEmpty(lineage.Subject.Name));
        Assert.NotNull(lineage.Subject.BirthYear);
        Assert.NotNull(lineage.Subject.Role);
    }

    // ── No parents (root ancestor) ────────────────────────────

    [Fact]
    public async Task GetLineage_Adam_NoParents_EmptyAncestors()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/1");

        Assert.NotNull(lineage);
        Assert.Equal("Adam", lineage.Subject.Name);
        Assert.Empty(lineage.Ancestors);
    }

    // ── Has children ──────────────────────────────────────────

    [Fact]
    public async Task GetLineage_Adam_HasDescendants()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/1");

        Assert.NotNull(lineage);
        Assert.NotEmpty(lineage.Descendants);
        Assert.Contains(lineage.Descendants, d => d.Name == "Seth");
        Assert.Contains(lineage.Descendants, d => d.Name == "Cain");
        Assert.Contains(lineage.Descendants, d => d.Name == "Abel");
    }

    // ── Both parents ──────────────────────────────────────────

    [Fact]
    public async Task GetLineage_Jesus_BothParentsInAncestors()
    {
        // Jesus (id=37) has father_id=122 (Joseph) and mother_id=38 (Mary)
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Equal("Jesus", lineage.Subject.Name);
        Assert.Contains(lineage.Ancestors, a => a.Name == "Joseph of Nazareth");
        Assert.Contains(lineage.Ancestors, a => a.Name == "Mary");
    }

    // ── Multi-generation ancestors ────────────────────────────

    [Fact]
    public async Task GetLineage_Isaac_MultiGenAncestors()
    {
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");
        var isaac = people!.First(p => p.Name == "Isaac");

        var lineage = await _client.GetFromJsonAsync<LineageDto>($"/api/lineage/{isaac.Id}");

        Assert.NotNull(lineage);
        Assert.True(lineage.Ancestors.Count >= 2);
        Assert.Contains(lineage.Ancestors, a => a.Name == "Abraham");
        Assert.Contains(lineage.Ancestors, a => a.Name == "Terah");
    }

    // ── Paternal ancestor chain ───────────────────────────────

    [Fact]
    public async Task GetLineage_Jesus_PaternalLineGoesDeep()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        // Joseph's father Jacob (id=280) should be an ancestor
        Assert.Contains(lineage.Ancestors, a => a.Name == "Jacob" && a.FatherId != null);
        Assert.True(lineage.Ancestors.Count >= 3,
            $"Expected at least 3 ancestors but got {lineage.Ancestors.Count}: " +
            string.Join(", ", lineage.Ancestors.Select(a => a.Name)));
    }

    // ── Siblings (shared parents) ─────────────────────────────

    [Fact]
    public async Task GetLineage_Jesus_HasBrotherJames()
    {
        // Jesus (id=37) and James brother of Jesus (id=144) share father_id=122 and mother_id=38
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.NotEmpty(lineage.Siblings);
        Assert.Contains(lineage.Siblings, s => s.Name == "James brother of Jesus");
    }

    [Fact]
    public async Task GetLineage_Siblings_SubjectNotIncluded()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.DoesNotContain(lineage.Siblings, s => s.Id == 37);
    }

    [Fact]
    public async Task GetLineage_Jacob_SiblingsIncludesEsau()
    {
        // Jacob and Esau share father=Isaac, mother=Rebekah
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");
        var jacob = people!.First(p => p.Name == "Jacob");

        var lineage = await _client.GetFromJsonAsync<LineageDto>($"/api/lineage/{jacob.Id}");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Siblings, s => s.Name == "Esau");
    }

    // ── Descendants through mother ────────────────────────────

    [Fact]
    public async Task GetLineage_Eve_DescendantsThroughMother()
    {
        // Eve (id=2) is mother of Seth (id=49), Cain (id=160), Abel (id=161)
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/2");

        Assert.NotNull(lineage);
        Assert.Equal("Eve", lineage.Subject.Name);
        Assert.NotEmpty(lineage.Descendants);
        Assert.Contains(lineage.Descendants, d => d.Name == "Seth");
    }

    // ── Father-only link (no mother set) ──────────────────────

    [Fact]
    public async Task GetLineage_Abraham_AncestorsHasFather()
    {
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");
        var abraham = people!.First(p => p.Name == "Abraham");

        var lineage = await _client.GetFromJsonAsync<LineageDto>($"/api/lineage/{abraham.Id}");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Ancestors, a => a.Name == "Terah");
        Assert.NotEmpty(lineage.Descendants);
        Assert.Contains(lineage.Descendants, d => d.Name == "Isaac");
    }

    // ── Half-siblings (shared father only) ────────────────────

    [Fact]
    public async Task GetLineage_Isaac_HalfSiblingIshmael()
    {
        // Isaac (father=Abraham, mother=Sarah) and Ishmael (father=Abraham, mother=Hagar)
        // share father → Ishmael is a half-sibling
        var people = await _client.GetFromJsonAsync<List<LineagePersonDto>>("/api/lineage/people");
        var isaac = people!.First(p => p.Name == "Isaac");

        var lineage = await _client.GetFromJsonAsync<LineageDto>($"/api/lineage/{isaac.Id}");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Siblings, s => s.Name == "Ishmael");
    }

    // ── All brothers of Jesus (Mark 6:3) ──────────────────────

    [Fact]
    public async Task GetLineage_Jesus_HasAllFourBrothers()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Siblings, s => s.Name == "James brother of Jesus");
        Assert.Contains(lineage.Siblings, s => s.Name == "Joses");
        Assert.Contains(lineage.Siblings, s => s.Name == "Simon");
        Assert.Contains(lineage.Siblings, s => s.Name == "Judas");
        Assert.Equal(4, lineage.Siblings.Count);
    }

    // ── Full ancestor chain from Jesus to Adam ────────────────

    [Fact]
    public async Task GetLineage_Jesus_AncestorsIncludeDavid()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Ancestors, a => a.Name == "David");
    }

    [Fact]
    public async Task GetLineage_Jesus_AncestorsIncludeAbraham()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Ancestors, a => a.Name == "Abraham");
    }

    [Fact]
    public async Task GetLineage_Jesus_AncestorsIncludeAdam()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Ancestors, a => a.Name == "Adam");
    }

    [Fact]
    public async Task GetLineage_Jesus_FullDavidicLine()
    {
        // Jesus → Joseph → ... → Solomon → David → Jesse → ... → Abraham → ... → Adam
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");
        Assert.NotNull(lineage);

        var names = lineage.Ancestors.Select(a => a.Name).ToHashSet();
        // Key ancestors in the Davidic line (Matthew 1)
        Assert.Contains("Joseph of Nazareth", names);
        Assert.Contains("Solomon", names);
        Assert.Contains("David", names);
        Assert.Contains("Jesse", names);
        Assert.Contains("Boaz", names);
        Assert.Contains("Judah", names);
        Assert.Contains("Jacob", names);  // patriarch Jacob
        Assert.Contains("Isaac", names);
        Assert.Contains("Abraham", names);
        Assert.Contains("Noah", names);
        Assert.Contains("Adam", names);

        // Should have many ancestors (35+ generations)
        Assert.True(lineage.Ancestors.Count >= 35,
            $"Expected 35+ ancestors but got {lineage.Ancestors.Count}");
    }

    // ── Extended family (children of ancestors) ───────────────

    [Fact]
    public async Task GetLineage_Jesus_ExtendedFamilyIncludesCainAndAbel()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.NotEmpty(lineage.ExtendedFamily);
        Assert.Contains(lineage.ExtendedFamily, e => e.Name == "Cain");
        Assert.Contains(lineage.ExtendedFamily, e => e.Name == "Abel");
    }

    [Fact]
    public async Task GetLineage_Jesus_ExtendedFamilyIncludesEsau()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.ExtendedFamily, e => e.Name == "Esau");
    }

    [Fact]
    public async Task GetLineage_Jesus_ExtendedFamilyIncludesIshmael()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Contains(lineage.ExtendedFamily, e => e.Name == "Ishmael");
    }

    [Fact]
    public async Task GetLineage_Jesus_ExtendedFamilyExcludesAncestors()
    {
        // Seth is Adam's son AND an ancestor of Jesus — should NOT be in extended family
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Name == "Seth");
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Name == "Abraham");
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Name == "David");
    }

    [Fact]
    public async Task GetLineage_Jesus_ExtendedFamilyExcludesSubjectAndSiblings()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Id == 37); // Jesus
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Name == "James brother of Jesus");
    }

    // ── Mary as ancestor (proves she's in the tree data) ──────

    [Fact]
    public async Task GetLineage_Jesus_MaryIsAncestor()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        var mary = lineage.Ancestors.FirstOrDefault(a => a.Name == "Mary");
        Assert.NotNull(mary);
        Assert.Equal(38, mary.Id);
        Assert.Null(mary.FatherId);  // Mary has no parents
        Assert.Null(mary.MotherId);
    }

    [Fact]
    public async Task GetLineage_Jesus_JosephHasFatherId()
    {
        // Joseph must have father_id set so the tree can chain back to David
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        var joseph = lineage.Ancestors.FirstOrDefault(a => a.Name == "Joseph of Nazareth");
        Assert.NotNull(joseph);
        Assert.Equal(280, joseph.FatherId); // Jacob (Matt 1:16)
    }

    [Fact]
    public async Task GetLineage_Jesus_SubjectHasBothParentIds()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");

        Assert.NotNull(lineage);
        Assert.Equal(122, lineage.Subject.FatherId); // Joseph
        Assert.Equal(38, lineage.Subject.MotherId);  // Mary
    }

    // ── Adam has 3 children visible in tree data ──────────────

    [Fact]
    public async Task GetLineage_Jesus_AdamHasThreeChildren()
    {
        var lineage = await _client.GetFromJsonAsync<LineageDto>("/api/lineage/37");
        Assert.NotNull(lineage);

        // Adam (1) is father of Seth (ancestor), Cain, Abel (extended family)
        var allPeople = lineage.Ancestors
            .Concat(lineage.ExtendedFamily)
            .Concat(lineage.Siblings)
            .Append(lineage.Subject)
            .ToList();

        var adamChildren = allPeople.Where(p => p.FatherId == 1).ToList();
        Assert.True(adamChildren.Count >= 3,
            $"Adam should have at least 3 children but found {adamChildren.Count}: " +
            string.Join(", ", adamChildren.Select(c => c.Name)));
        Assert.Contains(adamChildren, c => c.Name == "Seth");
        Assert.Contains(adamChildren, c => c.Name == "Cain");
        Assert.Contains(adamChildren, c => c.Name == "Abel");
    }
}

public class MapEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public MapEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMapEvents_ReturnsEventsWithLocations()
    {
        var events = await _client.GetFromJsonAsync<List<MapEventDto>>("/api/map/events");

        Assert.NotNull(events);
        Assert.NotEmpty(events);
        Assert.All(events, e =>
        {
            Assert.NotNull(e.Latitude);
            Assert.NotNull(e.Longitude);
            Assert.False(string.IsNullOrEmpty(e.EventName));
            Assert.False(string.IsNullOrEmpty(e.LocationName));
        });
    }

    [Fact]
    public async Task GetMapEvents_FilterByYearRange()
    {
        var events = await _client.GetFromJsonAsync<List<MapEventDto>>(
            "/api/map/events?startYear=-5&endYear=35");

        Assert.NotNull(events);
        Assert.NotEmpty(events);
        // All events should be in NT range
        Assert.All(events, e =>
        {
            var year = e.StartYear ?? e.EndYear;
            Assert.NotNull(year);
            Assert.InRange(year!.Value, -5, 35);
        });
    }

    [Fact]
    public async Task GetMapEvents_IncludesJerusalemEvents()
    {
        var events = await _client.GetFromJsonAsync<List<MapEventDto>>("/api/map/events");

        Assert.NotNull(events);
        Assert.Contains(events, e => e.LocationName == "Jerusalem");
    }

    [Fact]
    public async Task GetMapEvents_ExcludesNullCoordinateLocations()
    {
        var events = await _client.GetFromJsonAsync<List<MapEventDto>>("/api/map/events");

        Assert.NotNull(events);
        // Eden has null coordinates — should not appear
        Assert.DoesNotContain(events, e => e.LocationName == "Eden");
    }

    [Fact]
    public async Task GetMapJourney_ForJesus_ReturnsChronologicalSteps()
    {
        // Jesus = id 37
        var steps = await _client.GetFromJsonAsync<List<JourneyStepDto>>(
            "/api/map/journey/37");

        Assert.NotNull(steps);
        Assert.NotEmpty(steps);
        Assert.All(steps, s =>
        {
            Assert.NotNull(s.Latitude);
            Assert.NotNull(s.Longitude);
        });

        // Verify chronological order
        for (int i = 1; i < steps.Count; i++)
        {
            var prev = steps[i - 1].StartYear ?? steps[i - 1].EndYear ?? int.MaxValue;
            var curr = steps[i].StartYear ?? steps[i].EndYear ?? int.MaxValue;
            Assert.True(curr >= prev,
                $"Steps not ordered: {steps[i - 1].EventName}({prev}) should come before {steps[i].EventName}({curr})");
        }
    }

    [Fact]
    public async Task GetMapJourney_ForJesus_IncludesBethlehem()
    {
        var steps = await _client.GetFromJsonAsync<List<JourneyStepDto>>(
            "/api/map/journey/37");

        Assert.NotNull(steps);
        Assert.Contains(steps, s => s.LocationName == "Bethlehem");
    }

    [Fact]
    public async Task GetMapJourney_ForJesus_FilterByYearRange()
    {
        var steps = await _client.GetFromJsonAsync<List<JourneyStepDto>>(
            "/api/map/journey/37?startYear=28&endYear=30");

        Assert.NotNull(steps);
        Assert.NotEmpty(steps);
        Assert.All(steps, s =>
        {
            var year = s.StartYear ?? s.EndYear;
            Assert.NotNull(year);
            Assert.InRange(year!.Value, 28, 30);
        });
    }

    [Fact]
    public async Task GetMapJourney_NonExistentPerson_ReturnsEmpty()
    {
        var steps = await _client.GetFromJsonAsync<List<JourneyStepDto>>(
            "/api/map/journey/9999");

        Assert.NotNull(steps);
        Assert.Empty(steps);
    }

    [Fact]
    public async Task GetMapPeople_ReturnsOnlyPeopleWithMultipleLocatedEvents()
    {
        var people = await _client.GetFromJsonAsync<List<MapPersonDto>>("/api/map/people");

        Assert.NotNull(people);
        Assert.NotEmpty(people);
        Assert.All(people, p =>
        {
            Assert.True(p.EventCount >= 2);
            Assert.False(string.IsNullOrEmpty(p.Name));
        });
    }

    [Fact]
    public async Task GetMapPeople_IncludesJesus()
    {
        var people = await _client.GetFromJsonAsync<List<MapPersonDto>>("/api/map/people");

        Assert.NotNull(people);
        Assert.Contains(people, p => p.Name == "Jesus");
        var jesus = people.First(p => p.Name == "Jesus");
        Assert.True(jesus.EventCount >= 10, $"Jesus should have many located events but has {jesus.EventCount}");
    }

    [Fact]
    public async Task GetMapPeople_SortedByName()
    {
        var people = await _client.GetFromJsonAsync<List<MapPersonDto>>("/api/map/people");

        Assert.NotNull(people);
        for (int i = 1; i < people.Count; i++)
        {
            Assert.True(string.Compare(people[i].Name, people[i - 1].Name, StringComparison.Ordinal) >= 0,
                $"'{people[i].Name}' should come after '{people[i - 1].Name}'");
        }
    }

    [Fact]
    public async Task GetLocations_ReturnsLocationsWithCoordinates()
    {
        var locations = await _client.GetFromJsonAsync<List<Location>>("/api/map/locations");

        Assert.NotNull(locations);
        Assert.NotEmpty(locations);
        Assert.All(locations, l =>
        {
            Assert.NotNull(l.Latitude);
            Assert.NotNull(l.Longitude);
            Assert.False(string.IsNullOrEmpty(l.Name));
        });
    }

    [Fact]
    public async Task GetLocations_ExcludesEden()
    {
        // Eden has NULL coordinates
        var locations = await _client.GetFromJsonAsync<List<Location>>("/api/map/locations");

        Assert.NotNull(locations);
        Assert.DoesNotContain(locations, l => l.Name == "Eden");
    }

    [Fact]
    public async Task GetLocations_IncludesJerusalem()
    {
        var locations = await _client.GetFromJsonAsync<List<Location>>("/api/map/locations");

        Assert.NotNull(locations);
        var jerusalem = locations.FirstOrDefault(l => l.Name == "Jerusalem");
        Assert.NotNull(jerusalem);
        Assert.NotNull(jerusalem.Latitude);
        Assert.NotNull(jerusalem.Longitude);
        Assert.Equal("Jerusalem", jerusalem.ModernName);
    }
}

// ── Detail Panel Data Completeness Tests ─────────────────────

public class DetailPanelDataTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public DetailPanelDataTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    // ── Person detail completeness ────────────────────────────

    [Fact]
    public async Task PersonDetail_ScriptureReferences_HaveReferenceText()
    {
        // Adam (id=1) has scripture references
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/1");

        Assert.NotNull(person);
        Assert.NotEmpty(person.ScriptureReferences);
        Assert.All(person.ScriptureReferences, s =>
        {
            Assert.False(string.IsNullOrEmpty(s.ReferenceText),
                "Scripture reference must have non-empty referenceText for link generation");
        });
    }

    [Fact]
    public async Task PersonDetail_HasAllExpectedSections()
    {
        // Moses (id=10) should have description, events, relationships, scripture
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/10");

        Assert.NotNull(person);
        Assert.False(string.IsNullOrEmpty(person.Name));
        Assert.False(string.IsNullOrEmpty(person.Role));
        Assert.False(string.IsNullOrEmpty(person.Description));
        Assert.NotEmpty(person.Events);
        Assert.NotEmpty(person.Relationships);
    }

    [Fact]
    public async Task PersonDetail_David_HasScriptureReferences()
    {
        var person = await _client.GetFromJsonAsync<PersonDetailDto>("/api/people/20");

        Assert.NotNull(person);
        Assert.Equal("David", person.Name);
        Assert.NotEmpty(person.ScriptureReferences);
        Assert.All(person.ScriptureReferences, s =>
            Assert.False(string.IsNullOrEmpty(s.ReferenceText)));
    }

    // ── Event detail completeness ─────────────────────────────

    [Fact]
    public async Task EventDetail_ScriptureReferences_HaveReferenceText()
    {
        // Call of Abraham (id=5) has scripture references
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/5");

        Assert.NotNull(evt);
        Assert.NotEmpty(evt.ScriptureReferences);
        Assert.All(evt.ScriptureReferences, s =>
        {
            Assert.False(string.IsNullOrEmpty(s.ReferenceText),
                "Scripture reference must have non-empty referenceText for link generation");
            Assert.True(s.BookId > 0, "Scripture reference must have a valid bookId");
        });
    }

    [Fact]
    public async Task EventDetail_HasAllExpectedSections()
    {
        // Crucifixion (id=45) should have description, people, locations, scripture
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/45");

        Assert.NotNull(evt);
        Assert.False(string.IsNullOrEmpty(evt.Name));
        Assert.False(string.IsNullOrEmpty(evt.Category));
        Assert.False(string.IsNullOrEmpty(evt.Description));
        Assert.NotEmpty(evt.People);
        Assert.NotEmpty(evt.Locations);
        Assert.NotEmpty(evt.ScriptureReferences);
    }

    [Fact]
    public async Task EventDetail_ScriptureReferenceFormat_IsHumanReadable()
    {
        // Verify references look like "Genesis 12:1-9", not just IDs
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/5");

        Assert.NotNull(evt);
        var ref1 = evt.ScriptureReferences.First();
        Assert.Matches(@"^[A-Z1-3]", ref1.ReferenceText); // Starts with book name
        Assert.Contains(":", ref1.ReferenceText); // Contains chapter:verse separator
    }
}

/// <summary>
/// Tests that lock down correct scripture references for all of Jesus's events.
/// Prevents regression from event ID shifts in SeedData.sql.
/// </summary>
public class JesusEventScriptureTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public JesusEventScriptureTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    private async Task AssertEventScriptures(int eventId, string expectedName, params string[] expectedRefs)
    {
        var evt = await _client.GetFromJsonAsync<EventDetailDto>($"/api/events/{eventId}");
        Assert.NotNull(evt);
        Assert.Equal(expectedName, evt.Name);
        Assert.NotEmpty(evt.ScriptureReferences);

        var actualRefs = evt.ScriptureReferences.Select(s => s.ReferenceText).ToList();
        foreach (var expected in expectedRefs)
        {
            Assert.Contains(expected, actualRefs);
        }
        Assert.Equal(expectedRefs.Length, actualRefs.Count);
    }

    // ── Core Ministry Events ──────────────────────────────────

    [Fact]
    public async Task BirthOfJesus_HasCorrectReferences()
    {
        await AssertEventScriptures(42, "Birth of Jesus",
            "Luke 2:1-20", "Matthew 1:18–2:23");
    }

    [Fact]
    public async Task BaptismOfJesus_HasAllGospelParallels()
    {
        await AssertEventScriptures(43, "Baptism of Jesus",
            "Matthew 3:13-17", "Mark 1:9-11", "Luke 3:21-22", "John 1:29-34");
    }

    [Fact]
    public async Task SermonOnTheMount_HasCorrectReferences()
    {
        await AssertEventScriptures(44, "Sermon on the Mount",
            "Matthew 5:1–7:29", "Luke 6:17-49");
    }

    [Fact]
    public async Task Crucifixion_HasAllGospelParallels()
    {
        await AssertEventScriptures(45, "Crucifixion",
            "Matthew 27:32-56", "Mark 15:21-41", "Luke 23:26-49", "John 19:17-37");
    }

    [Fact]
    public async Task Resurrection_HasAllGospelParallels()
    {
        await AssertEventScriptures(46, "Resurrection",
            "Matthew 28:1-10", "Mark 16:1-8", "Luke 24:1-12", "John 20:1-18");
    }

    [Fact]
    public async Task Ascension_HasCorrectReferences()
    {
        await AssertEventScriptures(47, "Ascension",
            "Acts 1:9-11", "Luke 24:50-53", "Mark 16:19-20");
    }

    // ── Miracles of Jesus ─────────────────────────────────────

    [Fact]
    public async Task Miracle_WaterTurnedToWine()
    {
        await AssertEventScriptures(58, "Water Turned to Wine", "John 2:1-11");
    }

    [Fact]
    public async Task Miracle_HealingOfficialsSON()
    {
        await AssertEventScriptures(59, "Healing of the Official's Son", "John 4:46-54");
    }

    [Fact]
    public async Task Miracle_GreatCatchOfFish()
    {
        await AssertEventScriptures(60, "Great Catch of Fish", "Luke 5:1-11");
    }

    [Fact]
    public async Task Miracle_DemonPossessedManCapernaum()
    {
        await AssertEventScriptures(61, "Healing of a Demon-Possessed Man in Capernaum",
            "Mark 1:21-28", "Luke 4:31-37");
    }

    [Fact]
    public async Task Miracle_PetersMotherInLaw()
    {
        await AssertEventScriptures(62, "Healing of Peter's Mother-in-Law",
            "Matthew 8:14-15", "Mark 1:29-31", "Luke 4:38-39");
    }

    [Fact]
    public async Task Miracle_CleansingOfALeper()
    {
        await AssertEventScriptures(63, "Cleansing of a Leper",
            "Matthew 8:1-4", "Mark 1:40-45", "Luke 5:12-16");
    }

    [Fact]
    public async Task Miracle_HealingOfTheParalytic()
    {
        await AssertEventScriptures(64, "Healing of the Paralytic",
            "Mark 2:1-12", "Matthew 9:1-8", "Luke 5:17-26");
    }

    [Fact]
    public async Task Miracle_PoolOfBethesda()
    {
        await AssertEventScriptures(65, "Healing at the Pool of Bethesda", "John 5:1-17");
    }

    [Fact]
    public async Task Miracle_WitheredHand()
    {
        await AssertEventScriptures(66, "Healing of a Withered Hand",
            "Matthew 12:9-14", "Mark 3:1-6", "Luke 6:6-11");
    }

    [Fact]
    public async Task Miracle_CenturionsServant()
    {
        await AssertEventScriptures(67, "Healing of the Centurion's Servant",
            "Matthew 8:5-13", "Luke 7:1-10");
    }

    [Fact]
    public async Task Miracle_WidowsSonAtNain()
    {
        await AssertEventScriptures(68, "Raising of the Widow's Son at Nain", "Luke 7:11-17");
    }

    [Fact]
    public async Task Miracle_CalmingTheStorm()
    {
        await AssertEventScriptures(69, "Calming the Storm",
            "Mark 4:35-41", "Matthew 8:23-27", "Luke 8:22-25");
    }

    [Fact]
    public async Task Miracle_GeraseneDemoniac()
    {
        await AssertEventScriptures(70, "Healing of the Gerasene Demoniac",
            "Mark 5:1-20", "Matthew 8:28-34", "Luke 8:26-39");
    }

    [Fact]
    public async Task Miracle_WomanWithIssueOfBlood()
    {
        await AssertEventScriptures(71, "Healing of the Woman with the Issue of Blood",
            "Mark 5:25-34", "Matthew 9:20-22", "Luke 8:43-48");
    }

    [Fact]
    public async Task Miracle_RaisingJairusDaughter()
    {
        await AssertEventScriptures(72, "Raising of Jairus' Daughter",
            "Mark 5:21-43", "Matthew 9:18-26", "Luke 8:40-56");
    }

    [Fact]
    public async Task Miracle_TwoBlindMen()
    {
        await AssertEventScriptures(73, "Healing of Two Blind Men", "Matthew 9:27-31");
    }

    [Fact]
    public async Task Miracle_MuteMan()
    {
        await AssertEventScriptures(74, "Healing of a Mute Man", "Matthew 9:32-34");
    }

    [Fact]
    public async Task Miracle_FeedingThe5000()
    {
        await AssertEventScriptures(75, "Feeding of the 5,000",
            "John 6:1-15", "Matthew 14:13-21", "Mark 6:30-44", "Luke 9:10-17");
    }

    [Fact]
    public async Task Miracle_WalkingOnWater()
    {
        await AssertEventScriptures(76, "Walking on Water",
            "Matthew 14:22-33", "Mark 6:45-52", "John 6:16-21");
    }

    [Fact]
    public async Task Miracle_SyrophoenicianDaughter()
    {
        await AssertEventScriptures(77, "Healing of the Syrophoenician Woman's Daughter",
            "Matthew 15:21-28", "Mark 7:24-30");
    }

    [Fact]
    public async Task Miracle_DeafAndMuteMan()
    {
        await AssertEventScriptures(78, "Healing of a Deaf and Mute Man", "Mark 7:31-37");
    }

    [Fact]
    public async Task Miracle_FeedingThe4000()
    {
        await AssertEventScriptures(79, "Feeding of the 4,000",
            "Matthew 15:32-39", "Mark 8:1-10");
    }

    [Fact]
    public async Task Miracle_BlindManAtBethsaida()
    {
        await AssertEventScriptures(80, "Healing of a Blind Man at Bethsaida", "Mark 8:22-26");
    }

    [Fact]
    public async Task Miracle_Transfiguration()
    {
        await AssertEventScriptures(81, "Transfiguration",
            "Matthew 17:1-13", "Mark 9:2-13", "Luke 9:28-36");
    }

    [Fact]
    public async Task Miracle_BoyWithADemon()
    {
        await AssertEventScriptures(82, "Healing of a Boy with a Demon",
            "Mark 9:14-29", "Matthew 17:14-21", "Luke 9:37-43");
    }

    [Fact]
    public async Task Miracle_CoinInFishsMouth()
    {
        await AssertEventScriptures(83, "Coin in the Fish's Mouth", "Matthew 17:24-27");
    }

    [Fact]
    public async Task Miracle_ManBornBlind()
    {
        await AssertEventScriptures(84, "Healing of the Man Born Blind", "John 9:1-41");
    }

    [Fact]
    public async Task Miracle_CrippledWoman()
    {
        await AssertEventScriptures(85, "Healing of a Crippled Woman", "Luke 13:10-17");
    }

    [Fact]
    public async Task Miracle_ManWithDropsy()
    {
        await AssertEventScriptures(86, "Healing of a Man with Dropsy", "Luke 14:1-6");
    }

    [Fact]
    public async Task Miracle_RaisingOfLazarus()
    {
        await AssertEventScriptures(87, "Raising of Lazarus", "John 11:1-44");
    }

    [Fact]
    public async Task Miracle_TenLepers()
    {
        await AssertEventScriptures(88, "Healing of Ten Lepers", "Luke 17:11-19");
    }

    [Fact]
    public async Task Miracle_BlindBartimaeus()
    {
        await AssertEventScriptures(89, "Healing of Blind Bartimaeus",
            "Mark 10:46-52", "Matthew 20:29-34", "Luke 18:35-43");
    }

    [Fact]
    public async Task Miracle_CursingTheFigTree()
    {
        await AssertEventScriptures(91, "Cursing of the Fig Tree",
            "Matthew 21:18-22", "Mark 11:12-25");
    }

    [Fact]
    public async Task Miracle_HealingMalchusEar()
    {
        await AssertEventScriptures(92, "Healing of Malchus' Ear",
            "Luke 22:49-51", "John 18:10-11");
    }

    [Fact]
    public async Task Miracle_CatchOf153Fish()
    {
        await AssertEventScriptures(93, "Catch of 153 Fish", "John 21:1-14");
    }

    // ── Post-Resurrection Appearances ─────────────────────────

    [Fact]
    public async Task PostResurrection_AppearanceToMaryMagdalene()
    {
        await AssertEventScriptures(143, "Appearance to Mary Magdalene",
            "John 20:11-18", "Mark 16:9-11");
    }

    [Fact]
    public async Task PostResurrection_RoadToEmmaus()
    {
        await AssertEventScriptures(144, "Road to Emmaus",
            "Luke 24:13-35", "Mark 16:12-13");
    }

    [Fact]
    public async Task PostResurrection_AppearanceToDisciples()
    {
        await AssertEventScriptures(145, "Appearance to the Disciples",
            "John 20:19-25", "Luke 24:36-43");
    }

    [Fact]
    public async Task PostResurrection_AppearanceToThomas()
    {
        await AssertEventScriptures(146, "Appearance to Thomas", "John 20:26-29");
    }

    [Fact]
    public async Task PostResurrection_RestorationOfPeter()
    {
        await AssertEventScriptures(147, "Restoration of Peter", "John 21:15-19");
    }

    [Fact]
    public async Task PostResurrection_GreatCommission()
    {
        await AssertEventScriptures(148, "Great Commission",
            "Matthew 28:16-20", "Mark 16:15-18");
    }

    [Fact]
    public async Task PostResurrection_AppearanceToMaryMagdalene_HasCorrectPeople()
    {
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/143");
        Assert.NotNull(evt);
        Assert.Contains(evt.People, p => p.Name == "Jesus");
        Assert.Contains(evt.People, p => p.Name == "Mary Magdalene");
    }

    [Fact]
    public async Task PostResurrection_RoadToEmmaus_HasCleopas()
    {
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/144");
        Assert.NotNull(evt);
        Assert.Contains(evt.People, p => p.Name == "Jesus");
        Assert.Contains(evt.People, p => p.Name == "Cleopas");
    }

    [Fact]
    public async Task PostResurrection_AppearanceToThomas_HasThomas()
    {
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/146");
        Assert.NotNull(evt);
        Assert.Contains(evt.People, p => p.Name == "Jesus");
        Assert.Contains(evt.People, p => p.Name == "Thomas");
    }

    [Fact]
    public async Task PostResurrection_RestorationOfPeter_AtSeaOfGalilee()
    {
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/147");
        Assert.NotNull(evt);
        Assert.Contains(evt.People, p => p.Name == "Peter");
        Assert.Contains(evt.Locations, l => l.Name == "Sea of Galilee");
    }

    [Fact]
    public async Task PostResurrection_Ascension_HasPeopleAndLocation()
    {
        var evt = await _client.GetFromJsonAsync<EventDetailDto>("/api/events/47");
        Assert.NotNull(evt);
        Assert.Equal("Ascension", evt.Name);
        Assert.Contains(evt.People, p => p.Name == "Jesus");
        Assert.Contains(evt.People, p => p.Name == "Peter");
        Assert.Contains(evt.Locations, l => l.Name == "Bethany");
    }
}

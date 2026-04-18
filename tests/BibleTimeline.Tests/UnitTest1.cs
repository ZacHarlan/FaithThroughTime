using BibleTimeline.Web.Data;
using BibleTimeline.Web.Models;
using Microsoft.Data.Sqlite;

namespace BibleTimeline.Tests;

public class BibleTimelineDbTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly BibleTimelineDb _db;

    public BibleTimelineDbTests()
    {
        // In-memory SQLite for unit tests
        _connection = new SqliteConnection("Data Source=:memory:");
        _connection.Open();

        var initializer = new DatabaseInitializer("Data Source=:memory:");
        initializer.InitializeForTesting(_connection);

        // Seed a few test records
        SeedTestData(_connection);

        // BibleTimelineDb needs a connection string that reopens
        // For unit tests, use a shared in-memory DB
        var connStr = $"Data Source=unit_test_{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
        var sharedConn = new SqliteConnection(connStr);
        sharedConn.Open();

        var init2 = new DatabaseInitializer(connStr);
        init2.InitializeForTesting(sharedConn);
        SeedTestData(sharedConn);

        _db = new BibleTimelineDb(connStr);

        // Keep shared connection open for the lifetime of the test
        _connection = sharedConn;
    }

    private static void SeedTestData(SqliteConnection conn)
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            PRAGMA foreign_keys = OFF;

            INSERT INTO time_periods (name, start_year, end_year, color, sort_order) VALUES
            ('Test Period', -1000, -500, '#FF0000', 1);

            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description)
            VALUES ('TestPerson', -900, -830, 1, 1, 'probable', 'king', 'major', 'A test person');

            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description)
            VALUES ('MinorPerson', -850, -800, 1, 1, 'possible', 'prophet', 'minor', 'A minor test person');

            INSERT INTO events (name, start_year, end_year, start_approx, end_approx, date_confidence, category, significance, description)
            VALUES ('TestEvent', -870, -870, 0, 0, 'certain', 'war', 'major', 'A test event');

            INSERT INTO events (name, start_year, end_year, start_approx, end_approx, date_confidence, category, significance, description)
            VALUES ('MinorEvent', -820, NULL, 1, 1, 'traditional', 'miracle', 'minor', 'A minor test event');

            INSERT INTO person_events (person_id, event_id, role_in_event) VALUES (1, 1, 'protagonist');

            INSERT INTO person_relationships (person_id_1, person_id_2, relationship_type) VALUES (1, 2, 'contemporary');

            -- Locations for map tests
            INSERT INTO locations (name, modern_name, latitude, longitude, region, description) VALUES
            ('TestCity', 'ModernCity', 31.77, 35.23, 'TestRegion', 'A test city'),
            ('TestTown', 'ModernTown', 32.70, 35.30, 'TestRegion', 'A test town'),
            ('NullLocation', NULL, NULL, NULL, 'TestRegion', 'Location without coordinates');

            -- Link events to locations
            INSERT INTO event_locations (event_id, location_id) VALUES (1, 1), (2, 2);

            -- Add person 1 to event 2 so journey has 2 steps
            INSERT INTO person_events (person_id, event_id, role_in_event) VALUES (1, 2, 'witness');

            -- ═══════════════════════════════════════════════════════
            -- COMPREHENSIVE FAMILY TREE TEST DATA
            -- ═══════════════════════════════════════════════════════
            --
            -- Person IDs:
            --   1 = TestPerson (king, no parents)
            --   2 = MinorPerson (prophet, no family)
            --   3 = Wife (spouse of TestPerson, no parents)
            --   4 = ChildA (son of TestPerson & Wife)
            --   5 = ChildB (daughter of TestPerson & Wife — sibling of ChildA)
            --   6 = ChildC (son of TestPerson only — half-sibling, no mother set)
            --   7 = GrandchildX (son of ChildA, has mother SpouseOfChildA)
            --   8 = SpouseOfChildA (wife of ChildA, has own parents)
            --   9 = MotherOfSpouse (mother of SpouseOfChildA)
            --  10 = GreatGrandchild (child of GrandchildX)

            -- Person 3: Wife of TestPerson (mother of ChildA and ChildB)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description)
            VALUES ('Wife', -910, -840, 0, 0, 'probable', 'other', 'minor', 'Wife of TestPerson');

            -- Person 4: ChildA (son of TestPerson & Wife)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description, father_id, mother_id)
            VALUES ('ChildA', -870, -800, 0, 0, 'probable', 'prince', 'minor', 'Son of TestPerson and Wife', 1, 3);

            -- Person 5: ChildB (daughter, sibling of ChildA)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description, father_id, mother_id)
            VALUES ('ChildB', -865, -790, 0, 0, 'probable', 'other', 'minor', 'Daughter of TestPerson and Wife', 1, 3);

            -- Person 6: ChildC (half-sibling, only father set)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description, father_id)
            VALUES ('ChildC', -860, -785, 0, 0, 'probable', 'other', 'minor', 'Half-sibling: same father, no mother set', 1);

            -- Person 7: GrandchildX (child of ChildA & SpouseOfChildA)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description, father_id, mother_id)
            VALUES ('GrandchildX', -840, -770, 0, 0, 'probable', 'prince', 'minor', 'Grandchild via ChildA', 4, 8);

            -- Person 8: SpouseOfChildA (wife of ChildA, has own mother)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description, mother_id)
            VALUES ('SpouseOfChildA', -872, -805, 0, 0, 'probable', 'other', 'minor', 'Wife of ChildA', 9);

            -- Person 9: MotherOfSpouse (mother of SpouseOfChildA, no parents)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description)
            VALUES ('MotherOfSpouse', -900, -830, 0, 0, 'probable', 'other', 'minor', 'Mother of SpouseOfChildA');

            -- Person 10: GreatGrandchild (child of GrandchildX)
            INSERT INTO people (name, birth_year, death_year, birth_approx, death_approx, date_confidence, role, significance, description, father_id)
            VALUES ('GreatGrandchild', -810, -740, 0, 0, 'probable', 'other', 'minor', 'Great-grandchild of TestPerson', 7);

            PRAGMA foreign_keys = ON;
        """;
        cmd.ExecuteNonQuery();
    }

    [Fact]
    public async Task GetTimelineItems_ReturnsAllItems()
    {
        var items = await _db.GetTimelineItemsAsync(new TimelineQueryParams());

        Assert.NotNull(items);
        var list = items.ToList();
        Assert.True(list.Count >= 4);
    }

    [Fact]
    public async Task GetTimelineItems_FilterBySignificance()
    {
        var items = await _db.GetTimelineItemsAsync(new TimelineQueryParams { Significance = "major" });
        var list = items.ToList();

        Assert.All(list, i => Assert.Equal("major", i.Significance));
    }

    [Fact]
    public async Task GetTimelineItems_FilterPeopleOnly()
    {
        var items = await _db.GetTimelineItemsAsync(new TimelineQueryParams { IncludeEvents = false });
        var list = items.ToList();

        Assert.All(list, i => Assert.Equal("person", i.Type));
    }

    [Fact]
    public async Task GetTimelineItems_FilterEventsOnly()
    {
        var items = await _db.GetTimelineItemsAsync(new TimelineQueryParams { IncludePeople = false });
        var list = items.ToList();

        Assert.All(list, i => Assert.Equal("event", i.Type));
    }

    [Fact]
    public async Task GetTimelineItems_FilterByRole()
    {
        var items = await _db.GetTimelineItemsAsync(new TimelineQueryParams { Role = "king", IncludeEvents = false });
        var list = items.ToList();

        Assert.NotEmpty(list);
        Assert.All(list, i => Assert.Equal("king", i.Category));
    }

    [Fact]
    public async Task GetTimelineItems_FilterByDateRange()
    {
        var items = await _db.GetTimelineItemsAsync(new TimelineQueryParams { StartYear = -860, EndYear = -810 });
        var list = items.ToList();

        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task GetPersonDetail_ReturnsFullDetail()
    {
        var person = await _db.GetPersonDetailAsync(1);

        Assert.NotNull(person);
        Assert.Equal("TestPerson", person.Name);
        Assert.Equal("king", person.Role);
        Assert.Equal(-900, person.BirthYear);
        Assert.NotEmpty(person.Events);
        Assert.NotEmpty(person.Relationships);
    }

    [Fact]
    public async Task GetPersonDetail_NonExistent_ReturnsNull()
    {
        var person = await _db.GetPersonDetailAsync(9999);
        Assert.Null(person);
    }

    [Fact]
    public async Task GetEventDetail_ReturnsFullDetail()
    {
        var evt = await _db.GetEventDetailAsync(1);

        Assert.NotNull(evt);
        Assert.Equal("TestEvent", evt.Name);
        Assert.Equal("war", evt.Category);
        Assert.NotEmpty(evt.People);
    }

    [Fact]
    public async Task GetEventDetail_NonExistent_ReturnsNull()
    {
        var evt = await _db.GetEventDetailAsync(9999);
        Assert.Null(evt);
    }

    [Fact]
    public async Task GetTimePeriods_ReturnsSorted()
    {
        var periods = await _db.GetTimePeriodsAsync();
        var list = periods.ToList();

        Assert.NotEmpty(list);
        Assert.Contains(list, p => p.Name == "Test Period");
    }

    [Fact]
    public async Task GetFilterOptions_ReturnsPopulatedOptions()
    {
        var options = await _db.GetFilterOptionsAsync();

        Assert.NotEmpty(options.Roles);
        Assert.Contains("king", options.Roles);
        Assert.Contains("prophet", options.Roles);
        Assert.NotEmpty(options.EventCategories);
        Assert.NotEmpty(options.TimePeriods);
    }

    [Fact]
    public async Task Search_FindsByName()
    {
        var results = await _db.SearchAsync("TestPerson");
        var list = results.ToList();

        Assert.NotEmpty(list);
        Assert.Contains(list, r => r.Name == "TestPerson" && r.Type == "person");
    }

    [Fact]
    public async Task Search_FindsEvents()
    {
        var results = await _db.SearchAsync("TestEvent");
        var list = results.ToList();

        Assert.NotEmpty(list);
        Assert.Contains(list, r => r.Name == "TestEvent" && r.Type == "event");
    }

    [Fact]
    public async Task Search_FilterByType()
    {
        var results = await _db.SearchAsync("Test", "person");
        var list = results.ToList();

        Assert.NotEmpty(list);
        Assert.All(list, r => Assert.Equal("person", r.Type));
    }

    [Fact]
    public async Task Search_PrefixMatch()
    {
        var results = await _db.SearchAsync("TestPer");
        var list = results.ToList();

        Assert.Contains(list, r => r.Name == "TestPerson");
    }

    // ── Lineage Tests ─────────────────────────────────────────────

    [Fact]
    public async Task GetPeopleList_ReturnsAllPeople()
    {
        var people = await _db.GetPeopleListAsync();

        Assert.NotNull(people);
        Assert.True(people.Count >= 10);
        Assert.Contains(people, p => p.Name == "TestPerson");
        Assert.Contains(people, p => p.Name == "ChildA");
    }

    [Fact]
    public async Task GetPeopleList_SortedByName()
    {
        var people = await _db.GetPeopleListAsync();

        for (int i = 1; i < people.Count; i++)
        {
            Assert.True(string.Compare(people[i].Name, people[i - 1].Name, StringComparison.Ordinal) >= 0);
        }
    }

    [Fact]
    public async Task GetPeopleList_IncludesFatherAndMotherId()
    {
        var people = await _db.GetPeopleListAsync();
        var child = people.First(p => p.Name == "ChildA");

        Assert.Equal(1, child.FatherId);   // father = TestPerson
        Assert.Equal(3, child.MotherId);   // mother = Wife
    }

    // ── Family combination: Person with no parents (root) ─────

    [Fact]
    public async Task Lineage_NoParents_AncestorsEmpty()
    {
        // TestPerson (id=1) has no father_id or mother_id
        var lineage = await _db.GetLineageAsync(1);

        Assert.NotNull(lineage);
        Assert.Equal("TestPerson", lineage.Subject.Name);
        Assert.Empty(lineage.Ancestors);
    }

    // ── Family combination: Person with no family at all ──────

    [Fact]
    public async Task Lineage_NoFamily_AllListsEmpty()
    {
        // MinorPerson (id=2) has no parents, no children, no siblings
        var lineage = await _db.GetLineageAsync(2);

        Assert.NotNull(lineage);
        Assert.Equal("MinorPerson", lineage.Subject.Name);
        Assert.Empty(lineage.Ancestors);
        Assert.Empty(lineage.Descendants);
        Assert.Empty(lineage.Siblings);
    }

    // ── Family combination: Person with both father and mother ─

    [Fact]
    public async Task Lineage_BothParents_AncestorsIncludesFatherAndMother()
    {
        // ChildA (id=4) has father=TestPerson(1), mother=Wife(3)
        var lineage = await _db.GetLineageAsync(4);

        Assert.NotNull(lineage);
        Assert.Equal("ChildA", lineage.Subject.Name);
        Assert.Contains(lineage.Ancestors, a => a.Name == "TestPerson");
        Assert.Contains(lineage.Ancestors, a => a.Name == "Wife");
    }

    // ── Family combination: Person with only father set ───────

    [Fact]
    public async Task Lineage_FatherOnly_AncestorsIncludesFather()
    {
        // ChildC (id=6) has father=TestPerson(1), no mother
        var lineage = await _db.GetLineageAsync(6);

        Assert.NotNull(lineage);
        Assert.Equal("ChildC", lineage.Subject.Name);
        Assert.Contains(lineage.Ancestors, a => a.Name == "TestPerson");
        // No mother should be in ancestors
        Assert.DoesNotContain(lineage.Ancestors, a => a.Name == "Wife");
    }

    // ── Family combination: Person with children ──────────────

    [Fact]
    public async Task Lineage_HasChildren_DescendantsIncludesAllChildren()
    {
        // TestPerson (id=1) is father of ChildA(4), ChildB(5), ChildC(6)
        var lineage = await _db.GetLineageAsync(1);

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Descendants, d => d.Name == "ChildA");
        Assert.Contains(lineage.Descendants, d => d.Name == "ChildB");
        Assert.Contains(lineage.Descendants, d => d.Name == "ChildC");
    }

    // ── Family combination: Siblings (shared parents) ─────────

    [Fact]
    public async Task Lineage_Siblings_FullSiblingsFound()
    {
        // ChildA (id=4) and ChildB (id=5) share both parents (TestPerson & Wife)
        var lineage = await _db.GetLineageAsync(4);

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Siblings, s => s.Name == "ChildB");
    }

    [Fact]
    public async Task Lineage_Siblings_HalfSiblingFromFather()
    {
        // ChildA (id=4, father=1, mother=3) and ChildC (id=6, father=1, no mother)
        // share father → ChildC is a half-sibling of ChildA
        var lineage = await _db.GetLineageAsync(4);

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Siblings, s => s.Name == "ChildC");
    }

    [Fact]
    public async Task Lineage_Siblings_SubjectNotInOwnSiblings()
    {
        var lineage = await _db.GetLineageAsync(4);

        Assert.NotNull(lineage);
        Assert.DoesNotContain(lineage.Siblings, s => s.Name == "ChildA");
    }

    // ── Family combination: Spouse appears as ancestor of child ──

    [Fact]
    public async Task Lineage_ChildSeesSpouseAsAncestor()
    {
        // GrandchildX (id=7) has father=ChildA(4), mother=SpouseOfChildA(8)
        var lineage = await _db.GetLineageAsync(7);

        Assert.NotNull(lineage);
        Assert.Equal("GrandchildX", lineage.Subject.Name);
        Assert.Contains(lineage.Ancestors, a => a.Name == "ChildA");
        Assert.Contains(lineage.Ancestors, a => a.Name == "SpouseOfChildA");
    }

    // ── Family combination: Multi-generation descendants ──────

    [Fact]
    public async Task Lineage_MultiGenDescendants_IncludesGrandchildren()
    {
        // TestPerson → ChildA → GrandchildX → GreatGrandchild
        var lineage = await _db.GetLineageAsync(1);

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Descendants, d => d.Name == "GrandchildX");
        Assert.Contains(lineage.Descendants, d => d.Name == "GreatGrandchild");
    }

    // ── Family combination: Multi-generation ancestors ────────

    [Fact]
    public async Task Lineage_MultiGenAncestors_WalksUpMultipleGenerations()
    {
        // GreatGrandchild (id=10) → father GrandchildX(7) → father ChildA(4) → father TestPerson(1)
        var lineage = await _db.GetLineageAsync(10);

        Assert.NotNull(lineage);
        Assert.Equal("GreatGrandchild", lineage.Subject.Name);
        Assert.True(lineage.Ancestors.Count >= 3);
        Assert.Contains(lineage.Ancestors, a => a.Name == "GrandchildX");
        Assert.Contains(lineage.Ancestors, a => a.Name == "ChildA");
        Assert.Contains(lineage.Ancestors, a => a.Name == "TestPerson");
    }

    // ── Family combination: Maternal ancestor chain ───────────

    [Fact]
    public async Task Lineage_MaternalAncestorChain()
    {
        // GrandchildX(7) → mother SpouseOfChildA(8) → mother_id MotherOfSpouse(9)
        var lineage = await _db.GetLineageAsync(7);

        Assert.NotNull(lineage);
        Assert.Contains(lineage.Ancestors, a => a.Name == "SpouseOfChildA");
        Assert.Contains(lineage.Ancestors, a => a.Name == "MotherOfSpouse");
    }

    // ── Family combination: Descendants include through mother ──

    [Fact]
    public async Task Lineage_DescendantsThroughMother()
    {
        // Wife (id=3) is mother of ChildA(4) and ChildB(5)
        var lineage = await _db.GetLineageAsync(3);

        Assert.NotNull(lineage);
        Assert.Equal("Wife", lineage.Subject.Name);
        Assert.Contains(lineage.Descendants, d => d.Name == "ChildA");
        Assert.Contains(lineage.Descendants, d => d.Name == "ChildB");
        // Wife's descendants should also include grandchildren through ChildA
        Assert.Contains(lineage.Descendants, d => d.Name == "GrandchildX");
    }

    // ── Family combination: Non-existent person ──────────────

    [Fact]
    public async Task Lineage_NonExistent_ReturnsNull()
    {
        var lineage = await _db.GetLineageAsync(9999);
        Assert.Null(lineage);
    }

    // ── Family combination: Subject fields populated ─────────

    [Fact]
    public async Task Lineage_SubjectFieldsComplete()
    {
        var lineage = await _db.GetLineageAsync(1);

        Assert.NotNull(lineage);
        Assert.Equal(1, lineage.Subject.Id);
        Assert.Equal("TestPerson", lineage.Subject.Name);
        Assert.Equal(-900, lineage.Subject.BirthYear);
        Assert.Equal(-830, lineage.Subject.DeathYear);
        Assert.Equal("king", lineage.Subject.Role);
    }

    // ── Extended family: children of ancestors ────────────────

    [Fact]
    public async Task Lineage_ExtendedFamily_IncludesSiblingsOfAncestors()
    {
        // GrandchildX(7) has ancestor ChildA(4). ChildA has siblings ChildB(5) and ChildC(6).
        // ChildB and ChildC should appear in extendedFamily of GrandchildX.
        var lineage = await _db.GetLineageAsync(7);

        Assert.NotNull(lineage);
        Assert.Contains(lineage.ExtendedFamily, e => e.Name == "ChildB");
        Assert.Contains(lineage.ExtendedFamily, e => e.Name == "ChildC");
    }

    [Fact]
    public async Task Lineage_ExtendedFamily_ExcludesAncestors()
    {
        // ChildA is an ancestor of GrandchildX — should NOT be in extended family
        var lineage = await _db.GetLineageAsync(7);

        Assert.NotNull(lineage);
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Name == "ChildA");
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Name == "TestPerson");
    }

    [Fact]
    public async Task Lineage_ExtendedFamily_ExcludesSubject()
    {
        var lineage = await _db.GetLineageAsync(7);

        Assert.NotNull(lineage);
        Assert.DoesNotContain(lineage.ExtendedFamily, e => e.Id == 7);
    }

    [Fact]
    public async Task Lineage_ExtendedFamily_ChildrenOfTestPersonIncludesAll()
    {
        // TestPerson(1) has children: ChildA(4), ChildB(5), ChildC(6)
        // From GreatGrandchild(10): TestPerson is ancestor via ChildA
        // ChildB and ChildC should be in extended family
        var lineage = await _db.GetLineageAsync(10);

        Assert.NotNull(lineage);
        var allPeople = lineage.Ancestors
            .Concat(lineage.ExtendedFamily)
            .Concat(lineage.Siblings)
            .Append(lineage.Subject)
            .ToList();

        // ChildA is an ancestor (direct line), ChildB and ChildC are extended family
        var testPersonChildren = allPeople.Where(p => p.FatherId == 1).ToList();
        Assert.True(testPersonChildren.Count >= 3,
            $"TestPerson should have 3 children visible but found {testPersonChildren.Count}: " +
            string.Join(", ", testPersonChildren.Select(c => c.Name)));
    }

    // ── Map Tests ─────────────────────────────────────────────

    [Fact]
    public async Task GetMapEvents_ReturnsEventsWithLocations()
    {
        var events = await _db.GetMapEventsAsync(null, null);
        var list = events.ToList();

        Assert.NotEmpty(list);
        Assert.All(list, e =>
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
        var events = await _db.GetMapEventsAsync(-880, -860);
        var list = events.ToList();

        Assert.NotEmpty(list);
        Assert.Contains(list, e => e.EventName == "TestEvent");
    }

    [Fact]
    public async Task GetMapEvents_ExcludesNullCoordinateLocations()
    {
        var events = await _db.GetMapEventsAsync(null, null);
        var list = events.ToList();

        Assert.All(list, e =>
        {
            Assert.NotNull(e.Latitude);
            Assert.NotNull(e.Longitude);
        });
    }

    [Fact]
    public async Task GetMapEvents_OrderedByYear()
    {
        var events = await _db.GetMapEventsAsync(null, null);
        var list = events.ToList();

        for (int i = 1; i < list.Count; i++)
        {
            var prev = list[i - 1].StartYear ?? list[i - 1].EndYear ?? int.MaxValue;
            var curr = list[i].StartYear ?? list[i].EndYear ?? int.MaxValue;
            Assert.True(curr >= prev,
                $"Events not ordered: {list[i - 1].EventName}({prev}) should come before {list[i].EventName}({curr})");
        }
    }

    [Fact]
    public async Task GetJourney_ReturnsStepsForPerson()
    {
        // TestPerson (id=1) is linked to event 1 (TestCity) and event 2 (TestTown)
        var steps = await _db.GetJourneyAsync(1, null, null);
        var list = steps.ToList();

        Assert.True(list.Count >= 2);
        Assert.Contains(list, s => s.EventName == "TestEvent" && s.LocationName == "TestCity");
        Assert.Contains(list, s => s.EventName == "MinorEvent" && s.LocationName == "TestTown");
    }

    [Fact]
    public async Task GetJourney_OrderedChronologically()
    {
        var steps = await _db.GetJourneyAsync(1, null, null);
        var list = steps.ToList();

        for (int i = 1; i < list.Count; i++)
        {
            var prev = list[i - 1].StartYear ?? list[i - 1].EndYear ?? int.MaxValue;
            var curr = list[i].StartYear ?? list[i].EndYear ?? int.MaxValue;
            Assert.True(curr >= prev);
        }
    }

    [Fact]
    public async Task GetJourney_FilterByYearRange()
    {
        // TestEvent is at -870, MinorEvent is at -820
        var steps = await _db.GetJourneyAsync(1, -880, -850);
        var list = steps.ToList();

        Assert.Single(list);
        Assert.Equal("TestEvent", list[0].EventName);
    }

    [Fact]
    public async Task GetJourney_NonExistentPerson_ReturnsEmpty()
    {
        var steps = await _db.GetJourneyAsync(9999, null, null);
        Assert.Empty(steps);
    }

    [Fact]
    public async Task GetMapPeople_ReturnsPeopleWithMultipleLocatedEvents()
    {
        var people = await _db.GetMapPeopleAsync();
        var list = people.ToList();

        Assert.NotEmpty(list);
        Assert.All(list, p => Assert.True(p.EventCount >= 2));
        Assert.Contains(list, p => p.Name == "TestPerson");
    }

    [Fact]
    public async Task GetMapPeople_ExcludesPeopleWithFewerThanTwoEvents()
    {
        // MinorPerson (id=2) has no events at all
        var people = await _db.GetMapPeopleAsync();
        Assert.DoesNotContain(people, p => p.Name == "MinorPerson");
    }

    [Fact]
    public async Task GetLocations_ReturnsOnlyWithCoordinates()
    {
        var locations = await _db.GetLocationsAsync();
        var list = locations.ToList();

        Assert.NotEmpty(list);
        Assert.All(list, l =>
        {
            Assert.NotNull(l.Latitude);
            Assert.NotNull(l.Longitude);
        });
        // NullLocation should be excluded
        Assert.DoesNotContain(list, l => l.Name == "NullLocation");
    }

    [Fact]
    public async Task GetLocations_OrderedByName()
    {
        var locations = await _db.GetLocationsAsync();
        var list = locations.ToList();

        for (int i = 1; i < list.Count; i++)
        {
            Assert.True(string.Compare(list[i].Name, list[i - 1].Name, StringComparison.Ordinal) >= 0);
        }
    }

    public void Dispose()
    {
        _connection?.Dispose();
    }
}

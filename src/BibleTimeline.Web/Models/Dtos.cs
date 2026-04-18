namespace BibleTimeline.Web.Models;

// DTOs for API responses - flattened for the timeline view

public record TimelineItemDto
{
    public int Id { get; init; }
    public string Type { get; init; } = ""; // "person" or "event"
    public string Name { get; init; } = "";
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public bool StartApprox { get; init; }
    public bool EndApprox { get; init; }
    public string DateConfidence { get; init; } = "traditional";
    public string Significance { get; init; } = "minor";
    public string? Category { get; init; } // role for people, category for events
    public string? Description { get; init; }
    public string? DateNotes { get; init; }
}

public record PersonDetailDto : Person
{
    public List<EventSummaryDto> Events { get; init; } = [];
    public List<RelatedPersonDto> Relationships { get; init; } = [];
    public List<ScriptureReference> ScriptureReferences { get; init; } = [];
    public List<Location> Locations { get; init; } = [];
}

public record EventDetailDto : Event
{
    public List<PersonSummaryDto> People { get; init; } = [];
    public List<ScriptureReference> ScriptureReferences { get; init; } = [];
    public List<Location> Locations { get; init; } = [];
}

public record PersonSummaryDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Role { get; init; }
    public string? RoleInEvent { get; init; }
}

public record EventSummaryDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Category { get; init; }
    public string? RoleInEvent { get; init; }
}

public record RelatedPersonDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Role { get; init; }
    public string RelationshipType { get; init; } = "";
}

public record SearchResultDto
{
    public int Id { get; init; }
    public string Type { get; init; } = ""; // "person", "event", "book"
    public string Name { get; init; } = "";
    public string? Snippet { get; init; }
    public int? StartYear { get; init; }
}

public record FilterOptionsDto
{
    public List<string> Roles { get; init; } = [];
    public List<string> EventCategories { get; init; } = [];
    public List<string> Tribes { get; init; } = [];
    public List<string> DateConfidences { get; init; } = ["certain", "probable", "possible", "traditional"];
    public List<string> Significances { get; init; } = ["major", "minor"];
    public List<string> Testaments { get; init; } = ["OT", "NT"];
    public List<string> Genres { get; init; } = [];
    public List<TimePeriod> TimePeriods { get; init; } = [];
    public List<LocationOption> Locations { get; init; } = [];
    public List<BookOption> Books { get; init; } = [];
}

public record LocationOption
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
}

public record BookOption
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string Testament { get; init; } = "";
}

public record TimelineQueryParams
{
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public string? Role { get; init; }
    public string? Category { get; init; }
    public string? Significance { get; init; }
    public string? Period { get; init; }
    public string? Tribe { get; init; }
    public string? DateConfidence { get; init; }
    public string? Testament { get; init; }
    public int? BookId { get; init; }
    public int? LocationId { get; init; }
    public bool IncludePeople { get; init; } = true;
    public bool IncludeEvents { get; init; } = true;
}

// Lineage tree DTOs

public record LineagePersonDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public int? BirthYear { get; init; }
    public int? DeathYear { get; init; }
    public bool BirthApprox { get; init; }
    public bool DeathApprox { get; init; }
    public string? Role { get; init; }
    public int? FatherId { get; init; }
    public int? MotherId { get; init; }
}

public record LineageDto
{
    public LineagePersonDto Subject { get; init; } = null!;
    public List<LineagePersonDto> Ancestors { get; init; } = [];
    public List<LineagePersonDto> Descendants { get; init; } = [];
    public List<LineagePersonDto> Siblings { get; init; } = [];
    public List<LineagePersonDto> ExtendedFamily { get; init; } = [];
}

// Map feature DTOs

public record MapEventDto
{
    public int EventId { get; init; }
    public string EventName { get; init; } = "";
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public string? Category { get; init; }
    public string Significance { get; init; } = "minor";
    public int LocationId { get; init; }
    public string LocationName { get; init; } = "";
    public string? ModernName { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
}

public record JourneyStepDto
{
    public int EventId { get; init; }
    public string EventName { get; init; } = "";
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public string? Category { get; init; }
    public string? RoleInEvent { get; init; }
    public int LocationId { get; init; }
    public string LocationName { get; init; } = "";
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
}

public record MapPersonDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public int EventCount { get; init; }
}

public record BookJourneyListDto
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Description { get; init; }
    public int StopCount { get; init; }
}

public record BookJourneyStopDto
{
    public int EventId { get; init; }
    public string EventName { get; init; } = "";
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public string? Category { get; init; }
    public string? RoleInEvent { get; init; }
    public int LocationId { get; init; }
    public string LocationName { get; init; } = "";
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public string? Chapter { get; init; }
    public string? StopDescription { get; init; }
}

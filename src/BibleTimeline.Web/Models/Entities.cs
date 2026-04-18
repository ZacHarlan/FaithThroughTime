namespace BibleTimeline.Web.Models;

public record Person
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? AltNames { get; init; }
    public int? BirthYear { get; init; }
    public int? DeathYear { get; init; }
    public bool BirthApprox { get; init; } = true;
    public bool DeathApprox { get; init; } = true;
    public string DateConfidence { get; init; } = "traditional";
    public string? Role { get; init; }
    public string Significance { get; init; } = "minor";
    public string? Tribe { get; init; }
    public int? FatherId { get; init; }
    public int? MotherId { get; init; }
    public string? Description { get; init; }
    public string? DateNotes { get; init; }
}

public record Event
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public bool StartApprox { get; init; } = true;
    public bool EndApprox { get; init; } = true;
    public string DateConfidence { get; init; } = "traditional";
    public string? Category { get; init; }
    public string Significance { get; init; } = "minor";
    public string? Description { get; init; }
    public string? DateNotes { get; init; }
    public int SortOrder { get; init; }
}

public record TimePeriod
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public int StartYear { get; init; }
    public int EndYear { get; init; }
    public string? Color { get; init; }
    public int SortOrder { get; init; }
    public string? Description { get; init; }
}

public record BiblicalBook
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? Abbreviation { get; init; }
    public string? Testament { get; init; }
    public string? Genre { get; init; }
    public int? ApproxWritingYear { get; init; }
    public int? PeriodCoveredStart { get; init; }
    public int? PeriodCoveredEnd { get; init; }
}

public record ScriptureReference
{
    public int Id { get; init; }
    public int? BookId { get; init; }
    public int? ChapterStart { get; init; }
    public int? VerseStart { get; init; }
    public int? ChapterEnd { get; init; }
    public int? VerseEnd { get; init; }
    public string ReferenceText { get; init; } = "";
}

public record Location
{
    public int Id { get; init; }
    public string Name { get; init; } = "";
    public string? ModernName { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public string? Region { get; init; }
    public string? Description { get; init; }
}

public record PersonRelationship
{
    public int PersonId1 { get; init; }
    public int PersonId2 { get; init; }
    public string RelationshipType { get; init; } = "";
}

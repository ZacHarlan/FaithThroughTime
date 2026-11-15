namespace BibleTimeline.Web.Models;

// DTOs for the single-request dataset consumed by the browser (GET /api/dataset).

public record DatasetDto
{
    public DatasetMetaDto Meta { get; init; } = new();
    public List<DatasetPeriodDto> Periods { get; init; } = [];
    public List<DatasetPersonDto> People { get; init; } = [];
    public List<DatasetEventDto> Events { get; init; } = [];
    public List<DatasetRelationshipDto> Relationships { get; init; } = [];
    public List<DatasetLocationDto> Locations { get; init; } = [];
    public List<DatasetBookDto> Books { get; init; } = [];
    public List<DatasetJourneyDto> Journeys { get; init; } = [];
}

public record DatasetMetaDto
{
    public int Version { get; init; } = 2;
    public string GeneratedAt { get; init; } = "";
    public string Chronology { get; init; } = "ussher";
    public DatasetCountsDto Counts { get; init; } = new();
}

public record DatasetCountsDto
{
    public int People { get; init; }
    public int Events { get; init; }
    public int Locations { get; init; }
}

public record DatasetPeriodDto
{
    public int Id { get; init; }
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public int StartYear { get; init; }
    public int EndYear { get; init; }
    public string? Color { get; init; }
    public int SortOrder { get; init; }
    public string? Description { get; init; }
}

public record DatasetPersonEventDto
{
    public int Id { get; init; }
    public string? Role { get; init; }
}

public record DatasetPersonScriptureDto
{
    public string Ref { get; init; } = "";
    public string? Context { get; init; }
}

public record DatasetEventScriptureDto
{
    public string Ref { get; init; } = "";
}

public record DatasetPersonDto
{
    public int Id { get; init; }
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public List<string> AltNames { get; init; } = [];
    public int? BirthYear { get; init; }
    public int? DeathYear { get; init; }
    public bool BirthApprox { get; init; }
    public bool DeathApprox { get; init; }
    public string DateConfidence { get; init; } = "traditional";
    public string? Role { get; init; }
    public string Significance { get; init; } = "minor";
    public string? Tribe { get; init; }
    public int? FatherId { get; init; }
    public int? MotherId { get; init; }
    public string? Description { get; init; }
    public string? DateNotes { get; init; }
    public List<DatasetPersonEventDto> Events { get; init; } = [];
    public List<DatasetPersonScriptureDto> Scripture { get; init; } = [];
}

public record DatasetEventPersonDto
{
    public int Id { get; init; }
    public string? Role { get; init; }
}

public record DatasetEventDto
{
    public int Id { get; init; }
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public int? StartYear { get; init; }
    public int? EndYear { get; init; }
    public bool StartApprox { get; init; }
    public bool EndApprox { get; init; }
    public string DateConfidence { get; init; } = "traditional";
    public string? Category { get; init; }
    public string Significance { get; init; } = "minor";
    public string? Description { get; init; }
    public string? DateNotes { get; init; }
    public int SortOrder { get; init; }
    public List<DatasetEventPersonDto> People { get; init; } = [];
    public List<int> LocationIds { get; init; } = [];
    public List<DatasetEventScriptureDto> Scripture { get; init; } = [];
}

public record DatasetRelationshipDto
{
    public int A { get; init; }
    public int B { get; init; }
    public string Type { get; init; } = "";
}

public record DatasetLocationDto
{
    public int Id { get; init; }
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string? ModernName { get; init; }
    public double? Lat { get; init; }
    public double? Lng { get; init; }
    public string? Region { get; init; }
    public string? Description { get; init; }
}

public record DatasetBookDto
{
    public int Id { get; init; }
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string? Abbreviation { get; init; }
    public string? Testament { get; init; }
    public string? Genre { get; init; }
    public int? WritingYear { get; init; }
    public int? CoversStart { get; init; }
    public int? CoversEnd { get; init; }
}

public record DatasetJourneyStopDto
{
    public int Order { get; init; }
    public int LocationId { get; init; }
    public int? EventId { get; init; }
    public string Label { get; init; } = "";
    public string? Description { get; init; }
    public int? Year { get; init; }
    public string? Chapter { get; init; }
}

public record DatasetJourneyDto
{
    public int Id { get; init; }
    public string Slug { get; init; } = "";
    public string Name { get; init; } = "";
    public string? Description { get; init; }
    public int? BookId { get; init; }
    public List<int> PersonIds { get; init; } = [];
    public List<DatasetJourneyStopDto> Stops { get; init; } = [];
}

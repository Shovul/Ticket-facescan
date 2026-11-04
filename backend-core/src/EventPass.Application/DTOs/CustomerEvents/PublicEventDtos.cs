using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.CustomerEvents;

public class PublicEventQuery
{
    [StringLength(200)]
    public string? Search { get; set; }

    [RegularExpression("^(time|remaining|name)$")]
    public string Sort { get; set; } = "time";

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    // "Lọc theo loại vé: all, free, paid, both"
    public string? TicketType { get; set; }

    // "Lọc theo khoảng giá vé"
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }

    // "Lọc theo danh sách danh mục (cách nhau bởi dấu phẩy)"
    public string? Categories { get; set; }

    // "Lọc theo khoảng thời gian tổ chức"
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public record PublicTicketDto(int Id, string Name, decimal Price, int RemainingQuantity);

public class PublicEventDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? CoverImage { get; init; }
    public string Location { get; init; } = string.Empty;
    public string? OrganizerName { get; init; }
    public string? OrganizerAvatarUrl { get; init; }
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
    public int RemainingQuantity { get; init; }
    public IReadOnlyList<PublicTicketDto> Tickets { get; init; } = [];

    // "Danh sách các loại sự kiện được nhận diện cho sự kiện này"
    public IReadOnlyList<string> Categories { get; set; } = [];
}

public record PublicEventPage(
    IReadOnlyList<PublicEventDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    IReadOnlyDictionary<string, int>? CategoryCounts = null);

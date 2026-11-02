using EventPass.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace EventPass.Application.DTOs.Events
{
    public class CreateEventDto
    {
        public int OrganizerId { get; set; }
        public string OrganizerName { get; set; } = string.Empty;
        public string OrganizerEmail { get; set; } = string.Empty;
        public string OrganizerHotline { get; set; } = string.Empty;
        public string? OrganizerWebsite { get; set; }
        public string? OrganizerLegalId { get; set; }
        public IFormFile? OrganizerLogo { get; set; }
        
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? EventSpeakers { get; set; }
        public string Location { get; set; } = string.Empty;
        public List<IFormFile> EventImages { get; set; } = new List<IFormFile>();

        public DateTime PublicTime { get; set; }
        public DateTime OpenTicketTime { get; set; }
        public DateTime CloseTicketTime { get; set; }
        public DateTime OpenKioskTime { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public string? EmailSubject { get; set; }
        public string? EmailCheckinNote { get; set; }

        public List<CreateTicketDto> Tickets { get; set; } = new();
        public List<CreateKioskDto> Kiosks { get; set; } = new();
    }

    public class CreateTicketDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string? Description { get; set; }
    }

    public class CreateKioskDto
    {
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string? SecretToken { get; set; } 
    }

    public class EventSummaryDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string StatusText { get; set; } = string.Empty;
        public DateTime StartTime { get; set; }
        public string Location { get; set; } = string.Empty;
        public string CoverImage { get; set; } = string.Empty;
        public int Sold { get; set; }
        public int Total { get; set; }
    }

    public class PaginatedEventResponse
    {
        public List<EventSummaryDto> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }
}
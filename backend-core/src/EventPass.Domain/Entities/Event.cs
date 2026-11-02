using EventPass.Domain.Enums;

namespace EventPass.Domain.Entities;

public class Event : BaseEntity
{
   public int OrganizerId { get; set; }
    
    public string OrganizerName { get; set; } = string.Empty;
    public string OrganizerEmail { get; set; } = string.Empty;
    public string OrganizerHotline { get; set; } = string.Empty;
    public string? OrganizerWebsite { get; set; }
    public string? OrganizerLegalId { get; set; }
    public string? OrganizerLogo { get; set; }

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? EventSpeakers { get; set; }
    public string? CoverImage { get; set; }
    public string Location { get; set; } = string.Empty;
    
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public DateTime? PublicTime { get; set; }
    public DateTime? OpenTicketTime { get; set; }
    public DateTime? CloseTicketTime { get; set; }
    public DateTime? OpenKioskTime { get; set; }
    
    public string? EmailSubject { get; set; }
    public string? EmailCheckinNote { get; set; }

    public EventStatus Status { get; set; }
    public bool IsFaceRecognitionEnabled { get; set; } = false;
    public bool IsQrEnabled { get; set; } = false;

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<TicketDetail> TicketDetails { get; set; } = new List<TicketDetail>();
    public ICollection<Kiosk> Kiosks { get; set; } = new List<Kiosk>();
    public ICollection<string>? EventImages { get; set; } = new List<string>();
}

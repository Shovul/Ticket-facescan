using EventPass.Domain.Enums;

namespace EventPass.Domain.Entities;

public class Event : BaseEntity
{
    public int OrganizerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverImage { get; set; }
    public string Location { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public EventStatus Status { get; set; }
    public bool IsFaceRecognitionEnabled { get; set; } = false;
    public bool IsQrEnabled { get; set; } = false;

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<Order> Orders { get; set; } = new List<Order>();
    public ICollection<TicketDetail> TicketDetails { get; set; } = new List<TicketDetail>();
    public ICollection<string> EventImages { get; set; } = new List<string>();
}
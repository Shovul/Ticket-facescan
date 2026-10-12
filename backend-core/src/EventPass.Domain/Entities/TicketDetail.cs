using EventPass.Domain.Enums;

namespace EventPass.Domain.Entities;

public class TicketDetail : BaseEntity
{
    public int OrderId { get; set; }
    public int EventId { get; set; }
    public int TicketId { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public string QrCodeUrl { get; set; } = string.Empty;
    public string AttendeeName { get; set; } = string.Empty;
    public string AttendeeEmail { get; set; } = string.Empty;
    public string? AttendeePhone { get; set; }
    public string? AttendeeFaceData { get; set; }
    public TicketDetailStatus Status { get; set; }
    public DateTime? CheckedInAt { get; set; }

    public Order Order { get; set; } = null!;
    public Event Event { get; set; } = null!;
    public Ticket Ticket { get; set; } = null!;
    public ICollection<string> TicketImages { get; set; } = new List<string>();
}
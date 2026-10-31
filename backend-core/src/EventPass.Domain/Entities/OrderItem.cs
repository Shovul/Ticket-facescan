using Pgvector;

namespace EventPass.Domain.Entities;

public class OrderItem : BaseEntity
{
    public int OrderId { get; set; }
    public int TicketId { get; set; }
    public decimal UnitPrice { get; set; }
    public string Status { get; set; } = "reserved";
    public string? AttendeeName { get; set; }
    public string? AttendeeEmail { get; set; }
    public string? AttendeePhone { get; set; }
    public Vector? FaceVector { get; set; }
    public byte[]? ProtectedFaceImage { get; set; }
    public string? FaceImageContentType { get; set; }
    public DateTime? FaceConsentAt { get; set; }
    public string? ClaimTokenHash { get; set; }
    public int? TicketDetailId { get; set; }
    public Order Order { get; set; } = null!;
    public Ticket Ticket { get; set; } = null!;
    public TicketDetail? TicketDetail { get; set; }
}

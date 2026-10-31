using EventPass.Domain.Enums;

namespace EventPass.Domain.Entities;

public class Order : BaseEntity
{
    public int UserId { get; set; }
    public int EventId { get; set; }
    public decimal TotalAmount { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public PaymentStatus PaymentStatus { get; set; }
    public string? TransactionCode { get; set; }
    public string? ReservationStatus { get; set; }
    public string? RequestKey { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? PaymentExpiresAt { get; set; }
    public DateTime? PaidAt { get; set; }
    public string? PaymentReference { get; set; }
    public DateTime? ConfirmationEmailSentAt { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();

    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
    public ICollection<TicketDetail> TicketDetails { get; set; } = new List<TicketDetail>();
}

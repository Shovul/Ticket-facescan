using EventPass.Domain.Enums;

namespace EventPass.Domain.Entities;

public class Order : BaseEntity
{
    public int UserId { get; set; }
    public int EventId { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public PaymentStatus PaymentStatus { get; set; }
    public string? TransactionCode { get; set; }

    public User User { get; set; } = null!;
    public Event Event { get; set; } = null!;
    public ICollection<TicketDetail> TicketDetails { get; set; } = new List<TicketDetail>();
}
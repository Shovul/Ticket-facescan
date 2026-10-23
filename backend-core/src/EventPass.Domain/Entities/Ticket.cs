namespace EventPass.Domain.Entities;

public class Ticket : BaseEntity
{
    public int EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public int QuantitySold { get; set; } = 0;

    public Event Event { get; set; } = null!;
    public ICollection<TicketDetail> TicketDetails { get; set; } = new List<TicketDetail>();
}
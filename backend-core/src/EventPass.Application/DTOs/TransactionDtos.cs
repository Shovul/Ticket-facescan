namespace EventPass.Application.DTOs;

public class TransactionDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string TransactionCode { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "VietQR";
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? BuyerEmail { get; set; }
    public string? EventTitle { get; set; }
}

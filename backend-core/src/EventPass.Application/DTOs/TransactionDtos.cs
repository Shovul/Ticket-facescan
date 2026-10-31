namespace EventPass.Application.DTOs;

public class SePayWebhookPayload
{
    public long Id { get; set; }
    public string Gateway { get; set; } = string.Empty;
    public string TransactionDate { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public decimal TransferAmount { get; set; }
    public string Content { get; set; } = string.Empty;
    public string ReferenceCode { get; set; } = string.Empty;
}

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
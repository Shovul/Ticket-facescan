namespace EventPass.Application.DTOs.Kiosk;

public class VerifyKioskTokenRequest
{
    public int EventId { get; set; }
    public string SecretToken { get; set; } = string.Empty;
}

public class VerifyKioskTokenResponse
{
    public bool Success { get; set; }
    public int? KioskId { get; set; }
    public string? KioskName { get; set; }
    public string? EventTitle { get; set; }
    public string Message { get; set; } = string.Empty;
}

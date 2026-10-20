namespace EventPass.Application.DTOs.Kiosk;

public class KioskCheckinResponse
{
    public bool Success { get; set; }
    public string StatusCode { get; set; } = string.Empty; // SUCCESS, DUPLICATE, NOT_FOUND, SPOOF_DETECTED, NO_FACE, QUALITY_LOW
    public string Message { get; set; } = string.Empty;
    public string BorderColor { get; set; } = "#22C55E"; // #22C55E (xanh lá) hoặc #EF4444 (đỏ)
    
    public string? TicketCode { get; set; }
    public string? AttendeeName { get; set; }
    public string? AttendeeEmail { get; set; }
    public string? TicketTypeName { get; set; }
    public double? MatchDistance { get; set; }
    public double? SimilarityPercent { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public double TotalLatencyMs { get; set; }
}

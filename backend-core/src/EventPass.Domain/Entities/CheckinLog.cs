namespace EventPass.Domain.Entities;

public class CheckinLog
{
    public int Id { get; set; }
    public int? TicketDetailId { get; set; }
    public int EventId { get; set; }
    public string KioskName { get; set; } = "Kiosk Cổng 1";
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
    public double? MatchDistance { get; set; }
    public double? FaceConfidence { get; set; }
    public string Status { get; set; } = string.Empty; // 'VALID', 'DUPLICATE', 'SPOOF_DETECTED', 'NOT_FOUND'
    public string? Notes { get; set; }

    public TicketDetail? TicketDetail { get; set; }
    public Event Event { get; set; } = null!;
}

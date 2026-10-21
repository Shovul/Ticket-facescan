namespace EventPass.Application.DTOs.Kiosk;

public class KioskCodeCheckinRequest
{
    public int EventId { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public string KioskName { get; set; } = "Kiosk Cổng 1";
}

public class OfflineTicketDto
{
    public int Id { get; set; }
    public string TicketCode { get; set; } = string.Empty;
    public string AttendeeName { get; set; } = string.Empty;
    public string AttendeeEmail { get; set; } = string.Empty;
    public string TicketTypeName { get; set; } = string.Empty;
    public int Status { get; set; } // 0: Valid, 1: CheckedIn, 2: Cancelled
    public string? QrCodeUrl { get; set; }
    public DateTime? CheckedInAt { get; set; }
}

public class SyncOfflineLogsRequest
{
    public int EventId { get; set; }
    public string KioskName { get; set; } = "Kiosk Cổng 1";
    public List<OfflineLogItem> Logs { get; set; } = new();
}

public class OfflineLogItem
{
    public string TicketCode { get; set; } = string.Empty;
    public DateTime CapturedAt { get; set; }
    public string CheckinMethod { get; set; } = "QR_CODE"; // QR_CODE, MANUAL_CODE, FACE_ID_OFFLINE
    public string? Notes { get; set; }
}

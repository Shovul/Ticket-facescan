using EventPass.Application.DTOs.Kiosk;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EventPass.API.Controllers;

public class KioskCheckinFormRequest
{
    public int EventId { get; set; }
    public IFormFile? FaceImage { get; set; }
    public string KioskName { get; set; } = "Kiosk Cổng 1";
}

[ApiController]
[Route("api/v1/kiosk")]
public class KioskController : ControllerBase
{
    private readonly IKioskService _kioskService;
    private readonly ICheckinLogRepository _checkinLogRepo;
    private readonly ILogger<KioskController> _logger;

    public KioskController(
        IKioskService kioskService, 
        ICheckinLogRepository checkinLogRepo,
        ILogger<KioskController> logger)
    {
        _kioskService = kioskService;
        _checkinLogRepo = checkinLogRepo;
        _logger = logger;
    }

    /// <summary>
    /// Điểm danh Face ID siêu tốc tại trạm Kiosk (UC14 - Bảng 6.4 &amp; 6.5 Hồ sơ SGU)
    /// </summary>
    [HttpPost("checkin")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<KioskCheckinResponse>> Checkin([FromForm] KioskCheckinFormRequest request)
    {
        if (request.EventId <= 0)
        {
            return BadRequest(new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "INVALID_EVENT",
                Message = "Mã sự kiện (eventId) không hợp lệ.",
                BorderColor = "#EF4444"
            });
        }

        if (request.FaceImage == null || request.FaceImage.Length == 0)
        {
            return BadRequest(new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "NO_IMAGE",
                Message = "Chưa nhận được hình ảnh khuôn mặt từ trạm Kiosk.",
                BorderColor = "#EF4444"
            });
        }

        // Kiểm tra dung lượng ảnh tối đa (10MB)
        if (request.FaceImage.Length > 10 * 1024 * 1024)
        {
            return BadRequest(new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "FILE_TOO_LARGE",
                Message = "Kích thước tệp ảnh vượt quá giới hạn cho phép (10MB).",
                BorderColor = "#EF4444"
            });
        }

        try
        {
            await using var stream = request.FaceImage.OpenReadStream();
            var response = await _kioskService.CheckinByFaceAsync(
                request.EventId, 
                request.KioskName, 
                stream, 
                request.FaceImage.FileName, 
                HttpContext.RequestAborted);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi hệ thống khi xử lý điểm danh Face ID tại Kiosk: {Message}", ex.Message);
            return StatusCode(500, new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "SERVER_ERROR",
                Message = "Đã xảy ra sự cố nội bộ trong quá trình xử lý điểm danh.",
                BorderColor = "#EF4444"
            });
        }
    }

    /// <summary>
    /// Lấy nhật ký kiểm toán (Audit Trail theo NFR17) phục vụ màn hình giám sát Kiosk và Dashboard
    /// </summary>
    [HttpGet("events/{eventId}/logs")]
    public async Task<IActionResult> GetCheckinLogs(int eventId, [FromQuery] int limit = 20)
    {
        if (eventId <= 0)
            return BadRequest(new { Error = "Mã sự kiện không hợp lệ." });

        var logs = await _checkinLogRepo.GetRecentLogsByEventAsync(eventId, limit, HttpContext.RequestAborted);
        return Ok(logs);
    }

    /// <summary>
    /// Điểm danh bằng Mã vé hoặc Quét mã QR (Cơ chế Cứu hộ kép khi mạng lag/Face ID gián đoạn)
    /// </summary>
    [HttpPost("checkin-code")]
    public async Task<ActionResult<KioskCheckinResponse>> CheckinByCode([FromBody] KioskCodeCheckinRequest request)
    {
        if (request.EventId <= 0 || string.IsNullOrWhiteSpace(request.TicketCode))
        {
            return BadRequest(new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "INVALID_REQUEST",
                Message = "Thông tin mã sự kiện hoặc mã vé không hợp lệ.",
                BorderColor = "#EF4444"
            });
        }

        try
        {
            var response = await _kioskService.CheckinByCodeAsync(
                request.EventId,
                request.TicketCode,
                request.KioskName,
                HttpContext.RequestAborted);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi hệ thống khi điểm danh bằng mã vé: {Message}", ex.Message);
            return StatusCode(500, new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "SERVER_ERROR",
                Message = "Đã xảy ra lỗi nội bộ trong quá trình kiểm tra mã vé.",
                BorderColor = "#EF4444"
            });
        }
    }

    /// <summary>
    /// Đồng bộ trước giờ G: Tải toàn bộ danh sách vé của sự kiện về Local Cache / IndexedDB trên máy Kiosk
    /// </summary>
    [HttpGet("events/{eventId}/offline-tickets")]
    public async Task<ActionResult<IEnumerable<OfflineTicketDto>>> GetOfflineTickets(int eventId)
    {
        if (eventId <= 0)
            return BadRequest(new { Error = "Mã sự kiện không hợp lệ." });

        try
        {
            var tickets = await _kioskService.GetOfflineTicketsAsync(eventId, HttpContext.RequestAborted);
            return Ok(tickets);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi lấy danh sách vé offline cho sự kiện {EventId}: {Message}", eventId, ex.Message);
            return StatusCode(500, new { Error = "Không thể tải danh sách vé offline." });
        }
    }

    /// <summary>
    /// Đồng bộ ngầm (Background Sync): Đẩy các lượt quét ngoại tuyến từ Kiosk lên Server khi có mạng trở lại
    /// </summary>
    [HttpPost("events/{eventId}/sync-offline-logs")]
    public async Task<IActionResult> SyncOfflineLogs(int eventId, [FromBody] SyncOfflineLogsRequest request)
    {
        if (eventId <= 0)
            return BadRequest(new { Error = "Mã sự kiện không hợp lệ." });

        if (request.Logs == null || request.Logs.Count == 0)
            return Ok(new { Success = true, SyncedCount = 0, Message = "Không có dữ liệu ngoại tuyến cần đồng bộ." });

        try
        {
            var count = await _kioskService.SyncOfflineLogsAsync(eventId, request.KioskName, request.Logs, HttpContext.RequestAborted);
            return Ok(new
            {
                Success = true,
                SyncedCount = count,
                TotalReceived = request.Logs.Count,
                Message = $"Đã đồng bộ thành công {count} lượt quét ngoại tuyến lên máy chủ."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi đồng bộ log ngoại tuyến cho sự kiện {EventId}: {Message}", eventId, ex.Message);
            return StatusCode(500, new { Error = "Lỗi trong quá trình đồng bộ dữ liệu ngoại tuyến." });
        }
    }

    /// <summary>
    /// Giải phóng / Xóa Cache tức thì: Bắn tín hiệu SignalR tới toàn bộ Kiosk để dọn dẹp bộ nhớ đệm
    /// </summary>
    [HttpPost("events/{eventId}/clear-cache")]
    public async Task<IActionResult> ClearKioskCache(int eventId, [FromQuery] string? reason = null)
    {
        if (eventId <= 0)
            return BadRequest(new { Error = "Mã sự kiện không hợp lệ." });

        try
        {
            await _kioskService.NotifyPurgeCacheAsync(eventId, reason ?? "Organizer cleared cache manually", HttpContext.RequestAborted);
            return Ok(new
            {
                Success = true,
                EventId = eventId,
                Message = "Đã phát tín hiệu giải phóng bộ nhớ Cache tới toàn bộ máy Kiosk đang kết nối."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi khi gửi tín hiệu giải phóng cache cho sự kiện {EventId}: {Message}", eventId, ex.Message);
            return StatusCode(500, new { Error = "Không thể gửi tín hiệu xóa cache." });
        }
    }
}

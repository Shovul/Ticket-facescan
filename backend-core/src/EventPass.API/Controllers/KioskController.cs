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
}

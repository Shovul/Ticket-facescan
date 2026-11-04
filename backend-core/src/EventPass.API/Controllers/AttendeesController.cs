using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace EventPass.API.Controllers;

[ApiController]
[Route("api/admin/attendees")]
[Authorize(Roles = "Admin")]
public class AttendeesController : ControllerBase
{
    private readonly IAttendeeService _attendeeService;

    public AttendeesController(IAttendeeService attendeeService)
    {
        _attendeeService = attendeeService;
    }

    // 1. Lấy danh sách người tham dự (Phân trang 6 bản ghi/trang + Lọc)
    [HttpGet("{eventId}")]
    public async Task<IActionResult> GetAttendees(
        int eventId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] string? keyword = null,
        [FromQuery] string? ticketClass = null,
        [FromQuery] string? status = null)
    {
        var (items, totalCount) = await _attendeeService.GetPagedAttendeesAsync(
            eventId, pageNumber, keyword, ticketClass, status);

        return Ok(new
        {
            Items = items.Select(a => new
            {
                a.Id,
                a.TicketCode,
                a.AttendeeName,
                a.AttendeeEmail,
                a.AttendeePhone,
                a.AttendeeFaceData,
                a.HasFaceScan,
                Status = a.Status.ToString(),
                a.CheckedInAt,
                TicketClass = a.Ticket != null ? a.Ticket.Name : "N/A"
            }),
            TotalCount = totalCount,
            PageSize = 6,
            CurrentPage = pageNumber
        });
    }

    // 2. Điểm danh thủ công
    [HttpPost("{id}/manual-checkin")]
    public async Task<IActionResult> ManualCheckIn(int id)
    {
        var success = await _attendeeService.ManualCheckInAsync(id);
        if (!success)
        {
            return BadRequest(new { Message = "Vé không ở trạng thái hợp lệ để điểm danh (có thể đã checked-in hoặc bị khóa)." });
        }

        return Ok(new { Message = "Điểm danh thủ công thành công." });
    }

    // 3. Khóa / Mở khóa vé khẩn cấp (Toggle між Valid và Cancelled)
    [HttpPost("{id}/toggle-lock")]
    public async Task<IActionResult> ToggleLock(int id)
    {
        var success = await _attendeeService.ToggleTicketLockAsync(id);
        if (!success)
        {
            return NotFound(new { Message = "Không tìm thấy thông tin vé." });
        }

        return Ok(new { Message = "Đã cập nhật trạng thái khóa/mở khóa vé." });
    }

    // 4. Xuất tệp báo cáo đối soát CSV (mã hóa UTF-8 BOM chuẩn tiếng Việt)
    [HttpGet("export/{eventId}")]
    public async Task<IActionResult> ExportReport(
        int eventId,
        [FromQuery] string? keyword = null,
        [FromQuery] string? ticketClass = null,
        [FromQuery] string? status = null)
    {
        var fileBytes = await _attendeeService.ExportReconciliationReportAsync(
            eventId, keyword, ticketClass, status);

        var fileName = $"Danh_sach_tham_du_Event_{eventId}_{DateTime.Now:yyyy-MM-dd}.csv";

        return File(fileBytes, "text/csv; charset=utf-8", fileName);
    }
}
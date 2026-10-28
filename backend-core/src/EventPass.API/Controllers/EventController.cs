using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EventPass.Application.DTOs.Events;
using EventPass.Application.Interfaces;
using System.Security.Claims;

namespace EventPass.API.Controllers
{
    [ApiController]
    [Route("api/v1/events")]
    // [Authorize(Roles = "Admin")] 
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;
        private readonly ILogger<EventsController> _logger;

        public EventsController(IEventService eventService, ILogger<EventsController> logger)
        {
            _eventService = eventService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto dto)
        {
            try
            {
                // var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
                // if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int adminId))
                // {
                //     dto.OrganizerId = adminId;
                // }
                dto.OrganizerId = 2;

                var newEvent = await _eventService.CreateEventAsync(dto);
                
                return CreatedAtAction(
                    nameof(GetEventById),
                    new { id = newEvent.Id }, 
                    new { Message = "Sự kiện được khởi tạo và xuất bản thành công.", EventId = newEvent.Id }
                );
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("Lỗi Validation khi tạo sự kiện: {Message}", ex.Message);
                return BadRequest(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi hệ thống khi tạo sự kiện.");
                return StatusCode(500, new { Error = "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau." });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] CreateEventDto dto)
        {
            try
            {
                var updatedEvent = await _eventService.UpdateEventAsync(id, dto);
                return Ok(new { Message = "Cập nhật thông tin sự kiện thành công." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi hệ thống khi cập nhật sự kiện ID: {EventId}", id);
                return StatusCode(500, new { Error = "Lỗi hệ thống khi cập nhật." });
            }
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> CancelEvent(int id, [FromBody] CancelEventRequest request)
        {
            try
            {
                await _eventService.CancelEventAsync(id, request.Reason, request.IsConfirmed);
                
                return Ok(new { Message = "Sự kiện đã được hủy khẩn cấp và toàn bộ vé đã bị vô hiệu hóa." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Error = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi hệ thống khi hủy sự kiện ID: {EventId}", id);
                return StatusCode(500, new { Error = "Không thể hủy sự kiện lúc này." });
            }
        }

        [HttpPost("kiosk/{kioskId}/refresh-token")]
        public async Task<IActionResult> RefreshKioskToken(int kioskId, [FromBody] RefreshKioskTokenRequest request)
        {
            try
            {
                var newToken = await _eventService.RefreshKioskTokenAsync(kioskId, request.AdminPassword);
                
                return Ok(new { Message = "Cấp Token mới thành công.", SecretToken = newToken });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Cảnh báo bảo mật: Nhập sai mật khẩu Admin khi refresh token Kiosk ID: {KioskId}", kioskId);
                return Unauthorized(new { Error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi hệ thống khi refresh token.");
                return StatusCode(500, new { Error = "Đã xảy ra lỗi trên server." });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetEvents([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string search = "", [FromQuery] string status = "all")
        {
            try
            {
                var result = await _eventService.GetEventsAsync(page, pageSize, search, status);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi hệ thống khi lấy danh sách sự kiện.");
                return StatusCode(500, new { Error = "Không thể lấy danh sách sự kiện." });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetEventById(int id)
        {
            try
            {
                var eventDetail = await _eventService.GetEventByIdAsync(id);
                if (eventDetail == null) return NotFound(new { Error = "Không tìm thấy sự kiện." });
                
                return Ok(eventDetail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi hệ thống khi lấy sự kiện ID: {EventId}", id);
                return StatusCode(500, new { Error = "Không thể tải chi tiết sự kiện." });
            }
        }
    }

    public class CancelEventRequest
    {
        public string Reason { get; set; } = string.Empty;
        public bool IsConfirmed { get; set; }
    }

    public class RefreshKioskTokenRequest
    {
        public string AdminPassword { get; set; } = string.Empty;
    }
}
using System.Security.Claims;
using EventPass.Application.DTOs.Common;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;
using EventPass.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace EventPass.API.Controllers;

[Authorize(AuthenticationSchemes = "BookingCustomer")]
[ApiController]
[Route("api/v1/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAiServiceClient _aiClient;
    private readonly IFileStorageService _fileStorage;
    private readonly ILogger<TicketsController> _logger;

    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxFileSize = 6 * 1024 * 1024; // 6 MB
    private const long MinFileSize = 5 * 1024;        // 5 KB

    public TicketsController(
        AppDbContext db,
        IAiServiceClient aiClient,
        IFileStorageService fileStorage,
        ILogger<TicketsController> logger)
    {
        _db = db;
        _aiClient = aiClient;
        _fileStorage = fileStorage;
        _logger = logger;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return int.TryParse(claim, out int userId) ? userId : 0;
    }

    /// <summary>
    /// UC08: Bổ sung / Cập nhật ảnh Face ID cho thẻ vé điện tử
    /// PUT /api/v1/tickets/{id}/face
    /// Hỗ trợ id là TicketDetail.Id hoặc OrderItem.Id
    /// </summary>
    [HttpPut("{id:int}/face")]
    [HttpPost("{id:int}/face")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UpdateTicketFace(int id, [FromForm] UpdateTicketFaceRequestDto request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized(ApiResponse<object>.Fail("Phiên đăng nhập không hợp lệ hoặc đã hết hạn."));

        // 1. Tìm thông tin vé trong CSDL (theo TicketDetail.Id hoặc OrderItem.Id)
        var ticket = await _db.TicketDetails
            .Include(t => t.Order)
            .Include(t => t.Event)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, ct);

        if (ticket == null)
        {
            var item = await _db.OrderItems
                .Include(oi => oi.TicketDetail)
                .Include(oi => oi.Order)
                .FirstOrDefaultAsync(oi => oi.Id == id, ct);
            if (item?.TicketDetail != null)
            {
                ticket = item.TicketDetail;
                if (ticket.Order == null && item.Order != null)
                {
                    ticket.Order = item.Order;
                }
            }
        }

        if (ticket == null)
            return NotFound(ApiResponse<object>.Fail("Không tìm thấy thông tin vé yêu cầu."));

        if (ticket.Event == null && ticket.EventId > 0)
        {
            ticket.Event = await _db.Events.FirstOrDefaultAsync(e => e.Id == ticket.EventId, ct);
        }

        // 2. Xác thực quyền sở hữu vé (Vé phải thuộc đơn hàng của User đang đăng nhập)
        if (ticket.Order != null && ticket.Order.UserId != userId)
            return StatusCode(403, ApiResponse<object>.Fail("Bạn không có quyền thay đổi thông tin Face ID của vé này."));

        // 3. KIỂM TRA QUAN TRỌNG: VÉ CHƯA CHECK-IN
        if (ticket.Status == TicketDetailStatus.CheckedIn || ticket.CheckedInAt != null)
        {
            var checkInTime = ticket.CheckedInAt?.ToString("dd/MM/yyyy HH:mm") ?? "trước đó";
            return BadRequest(ApiResponse<object>.Fail($"Vé này đã được sử dụng để check-in vào cổng sự kiện lúc {checkInTime}. Không thể thay đổi ảnh Face ID sau khi đã vào cổng."));
        }

        // 4. Kiểm tra trạng thái vé và sự kiện
        if (ticket.Status == TicketDetailStatus.Cancelled)
            return BadRequest(ApiResponse<object>.Fail("Vé này đã bị hủy, không thể bổ sung hoặc đổi ảnh Face ID."));

        if (ticket.Event != null && ticket.Event.EndTime < DateTime.UtcNow)
            return BadRequest(ApiResponse<object>.Fail("Sự kiện này đã kết thúc, không thể thay đổi dữ liệu Face ID."));

        // 5. Kiểm tra tệp ảnh tải lên
        if (request?.Image == null || request.Image.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("Vui lòng tải lên tệp ảnh chân dung rõ nét."));

        if (request.Image.Length > MaxFileSize)
            return BadRequest(ApiResponse<object>.Fail("Dung lượng tệp ảnh không được vượt quá 6MB."));

        if (request.Image.Length < MinFileSize)
            return BadRequest(ApiResponse<object>.Fail("Dung lượng tệp ảnh quá nhỏ hoặc bị hỏng (yêu cầu tối thiểu 5KB)."));

        var ext = Path.GetExtension(request.Image.FileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            return BadRequest(ApiResponse<object>.Fail("Định dạng tệp không được hỗ trợ. Chỉ chấp nhận các định dạng ảnh: .jpg, .jpeg, .png, .webp."));

        using var ms = new MemoryStream();
        await request.Image.CopyToAsync(ms, ct);
        var imageBytes = ms.ToArray();

        // 6. Kiểm tra Magic Bytes nhị phân (chống giả mạo file)
        if (!IsValidImageHeader(imageBytes))
            return BadRequest(ApiResponse<object>.Fail("Tệp tải lên không phải là định dạng hình ảnh hợp lệ."));

        // 7. Gửi sang AI Microservice để kiểm định chất lượng ISO/ICAO, chống giả mạo & trích xuất vector 512-d
        using var aiStream = new MemoryStream(imageBytes);
        var aiResult = await _aiClient.ExtractFaceEmbeddingAsync(
            aiStream,
            request.Image.FileName,
            enforceDetection: true,
            antiSpoofing: true,
            isEnrollment: true,
            cancellationToken: ct);

        if (!aiResult.Success || aiResult.Embedding == null || aiResult.Embedding.Count != 512 ||
            aiResult.Embedding.Any(v => !float.IsFinite(v)) || aiResult.Embedding.All(v => v == 0))
        {
            return BadRequest(ApiResponse<object>.Fail(
                aiResult.ErrorMessage ?? "Không phát hiện khuôn mặt hợp lệ hoặc ảnh không đạt chuẩn sinh trắc học. Vui lòng chụp ảnh chính diện, rõ nét và đủ ánh sáng."));
        }

        // 8. Kiểm tra khuôn mặt không bị trùng lặp với vé khác trong cùng sự kiện
        var otherFaces = await _db.TicketDetails
            .Where(td => td.EventId == ticket.EventId && td.Id != ticket.Id && td.FaceVector != null && !td.IsDeleted)
            .Select(td => td.FaceVector!)
            .ToListAsync(ct);

        if (otherFaces.Any(v => CosineDistance(v, aiResult.Embedding.ToArray()) <= 0.35))
        {
            return Conflict(ApiResponse<object>.Fail("Khuôn mặt này đã được đăng ký cho một vé khác trong cùng sự kiện. Mỗi người tham dự chỉ được gán duy nhất 1 vé."));
        }

        // 9. Tải ảnh chân dung mới lên Dropbox Cloud để lưu trữ 30 ngày (NFR12)
        var fileName = $"ticket_{ticket.Id}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
        string? dropboxUrl = null;
        try
        {
            dropboxUrl = await _fileStorage.SaveBytesFileAsync(imageBytes, fileName, "faces");
            _logger.LogInformation("📸 [DROPBOX] Đã cập nhật ảnh Face ID vé {TicketId} lên Dropbox: {Url}", ticket.Id, dropboxUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ [DROPBOX] Không thể tải ảnh vé lên Dropbox cho vé {TicketId}: {Message}", ticket.Id, ex.Message);
        }

        // 10. Cập nhật vector 512-d và link ảnh vào bảng ticket_details
        ticket.FaceVector = new Vector(aiResult.Embedding.ToArray());
        if (!string.IsNullOrEmpty(dropboxUrl))
        {
            ticket.AttendeeFaceData = dropboxUrl;
        }
        else
        {
            ticket.AttendeeFaceData = $"data:image/jpeg;base64,{Convert.ToBase64String(imageBytes)}";
        }

        // Đồng bộ ngược lại order_items tương ứng nếu có
        var orderItem = await _db.OrderItems.FirstOrDefaultAsync(oi => oi.TicketDetailId == ticket.Id || (oi.OrderId == ticket.OrderId && oi.TicketId == ticket.TicketId), ct);
        if (orderItem != null)
        {
            orderItem.FaceVector = ticket.FaceVector;
            if (!string.IsNullOrEmpty(dropboxUrl))
            {
                orderItem.FaceImageContentType = $"image/jpeg|{dropboxUrl}";
            }
        }

        await _db.SaveChangesAsync(ct);

        return Ok(ApiResponse<object>.Ok(new
        {
            ticketId = ticket.Id,
            ticketCode = ticket.TicketCode,
            hasFaceId = true,
            avatarUrl = ticket.AttendeeFaceData,
            faceIdReady = true
        }, "Cập nhật Face ID cho vé thành công! Dữ liệu đã sẵn sàng cho làn nhận diện Kiosk."));
    }

    private static bool IsValidImageHeader(byte[] bytes)
    {
        if (bytes == null || bytes.Length < 4) return false;
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return true; // JPEG
        if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) return true; // PNG
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 && // RIFF
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) // WEBP
            return true;
        return false;
    }

    private static double CosineDistance(Vector a, float[] b)
    {
        var va = a.ToArray();
        double dot = 0, na = 0, nb = 0;
        for (var i = 0; i < va.Length && i < b.Length; i++)
        {
            dot += va[i] * b[i];
            na += va[i] * va[i];
            nb += b[i] * b[i];
        }
        return 1.0 - dot / (Math.Sqrt(na) * Math.Sqrt(nb) + 1e-7);
    }
}

public class UpdateTicketFaceRequestDto
{
    public IFormFile Image { get; set; } = null!;
    public bool Consent { get; set; } = true;
}

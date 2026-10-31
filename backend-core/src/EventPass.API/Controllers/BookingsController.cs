using System.Security.Claims;
using EventPass.Application.DTOs.Bookings;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventPass.API.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = "BookingCustomer")]
[Route("api/v1/bookings")]
public class BookingsController(IBookingService service, ILogger<BookingsController> logger) : ControllerBase
{
    private int UserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub"), out var id) && id > 0
        ? id : throw new BookingException(401, "Phiên đăng nhập không hợp lệ.");

    private async Task<IActionResult> Handle<T>(Func<Task<T>> action)
    {
        Response.Headers.CacheControl = "no-store";
        try { return Ok(await action()); }
        catch (BookingException ex) { return StatusCode(ex.StatusCode, new { Message = ex.Message }); }
        catch (DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        { return Conflict(new { Message = "Yêu cầu đã được ghi nhận. Vui lòng tải lại đơn hiện có." }); }
        catch (OperationCanceledException) when (HttpContext.RequestAborted.IsCancellationRequested) { return StatusCode(499); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Lỗi xử lý đặt vé.");
            return StatusCode(503, new { Message = "Dịch vụ đặt vé tạm thời gián đoạn. Vui lòng thử lại." });
        }
    }

    [HttpPost]
    public Task<IActionResult> Reserve(ReserveTicketsRequest request, CancellationToken ct) => Handle(() => service.ReserveAsync(UserId, request, ct));

    [HttpGet("customer-summary")]
    public Task<IActionResult> Customer(CancellationToken ct) => Handle(() => service.GetCustomerAsync(UserId, ct));

    [HttpGet("{code}")]
    public Task<IActionResult> Get(string code, CancellationToken ct) => Handle(() => service.GetAsync(UserId, code, ct));

    [HttpPut("{code}/items/{itemId:int}/attendee")]
    public Task<IActionResult> Attendee(string code, int itemId, AttendeeRequest request, CancellationToken ct) =>
        Handle(() => service.UpdateAttendeeAsync(UserId, code, itemId, request, ct));

    [HttpPost("{code}/items/{itemId:int}/face")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<IActionResult> Face(string code, int itemId, [FromForm] BookingFaceForm form, CancellationToken ct) => Handle(async () =>
    {
        var (bytes, contentType) = await ReadFace(form, ct);
        return await service.UploadFaceAsync(UserId, code, itemId, form, bytes, contentType, ct);
    });

    [HttpPost("{code}/confirm-free")]
    public Task<IActionResult> Confirm(string code, CancellationToken ct) => Handle(() => service.ConfirmFreeAsync(UserId, code, ct));

    [HttpPost("{code}/cancel")]
    public Task<IActionResult> Cancel(string code, CancellationToken ct) => Handle(() => service.CancelAsync(UserId, code, ct));
    [HttpGet("my-tickets")]
    public Task<IActionResult> Tickets([FromQuery] int page = 1, [FromQuery] string filter = "all", CancellationToken ct = default) =>
        Handle(() => service.GetTicketsAsync(UserId, page, filter, ct));

    [HttpGet("{code}/items/{itemId:int}/pass")]
    public Task<IActionResult> Pass(string code, int itemId, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Handle(() => service.GetPassAsync(UserId, code, itemId, ct));
    }

    [HttpPost("{code}/cancel/{part}")]
    public Task<IActionResult> CancelPart(string code, string part, CancellationToken ct) =>
        Handle(() => service.CancelPartAsync(UserId, code, part, ct));

    [HttpPost("{code}/items/{itemId:int}/claim-link")]
    public Task<IActionResult> ClaimLink(string code, int itemId, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Handle(() => service.CreateClaimAsync(UserId, code, itemId, ct));
    }

    [AllowAnonymous]
    [HttpGet("claims/{token}")]
    public Task<IActionResult> Claim(string token, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Handle(() => service.GetClaimAsync(token, ct));
    }

    [AllowAnonymous]
    [HttpPost("claims/{token}")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public Task<IActionResult> CompleteClaim(string token, [FromForm] ClaimFaceForm form, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Handle(async () =>
        {
            var (bytes, contentType) = await ReadFace(new BookingFaceForm { Image = form.Image, Consent = form.Consent }, ct);
            return await service.CompleteClaimAsync(token, form, bytes, contentType, ct);
        });
    }

    private static async Task<(byte[] Bytes, string ContentType)> ReadFace(BookingFaceForm form, CancellationToken ct)
    {
        if (!form.Consent) throw new BookingException(400, "Bạn cần đồng ý xử lý dữ liệu khuôn mặt trước khi tải ảnh.");
        if (form.Image == null || form.Image.Length is <= 0 or > 5 * 1024 * 1024)
            throw new BookingException(400, "Ảnh chân dung phải có dung lượng tối đa 5 MB.");
        using var stream = new MemoryStream();
        await form.Image.CopyToAsync(stream, ct);
        var bytes = stream.ToArray();
        var contentType = bytes.Length >= 8 && bytes[0] == 137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71 ? "image/png"
            : bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255 ? "image/jpeg" : null;
        if (contentType == null) throw new BookingException(400, "Chỉ chấp nhận ảnh JPG hoặc PNG.");
        return (bytes, contentType);
    }

}

public class BookingFaceForm : AttendeeRequest
{
    public IFormFile? Image { get; set; }
    public bool Consent { get; set; }
}

public class ClaimFaceForm : AttendeeRequest
{
    public IFormFile? Image { get; set; }
    public bool Consent { get; set; }
}

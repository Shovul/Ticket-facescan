using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EventPass.API.Hubs;
using EventPass.Application.DTOs.Bookings;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EventPass.API.Controllers;

[ApiController]
[Authorize(AuthenticationSchemes = "BookingCustomer")]
[Route("api/v1/bookings")]
public class BookingsController(
    IBookingService service,
    IBookingRepository repository,
    IBookingPaymentReceiver paymentReceiver,
    IHubContext<TransactionHub> transactionHub,
    IConfiguration configuration,
    ILogger<BookingsController> logger) : ControllerBase
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

    /// <summary>
    /// UC07: Dùng sẵn Face ID từ Profile (UC05) cho vé người mua
    /// </summary>
    [HttpPost("{code}/items/{itemId:int}/use-profile-face")]
    public Task<IActionResult> UseProfileFace(string code, int itemId, [FromBody] AttendeeRequest? attendee, CancellationToken ct) =>
        Handle(() => service.UseProfileFaceAsync(UserId, code, itemId, attendee, ct));

    [HttpPost("{code}/confirm-free")]
    public Task<IActionResult> Confirm(string code, CancellationToken ct) => Handle(() => service.ConfirmFreeAsync(UserId, code, ct));

    // Webhook tiếp nhận và đối soát thanh toán tự động từ cổng PayOS
    [HttpPost("webhook/payos")]
    [AllowAnonymous]
    public async Task<IActionResult> ReceivePayOsWebhook([FromBody] PayOSWebhookPayload payload, CancellationToken ct)
    {
        if (payload?.Data == null)
            return BadRequest(new { code = "01", desc = "Payload không hợp lệ." });

        // Kiểm tra chữ ký bảo mật nếu đã cấu hình ChecksumKey
        var checksumKey = configuration["PayOS:ChecksumKey"];
        if (!string.IsNullOrWhiteSpace(checksumKey) && !string.IsNullOrWhiteSpace(payload.Signature))
        {
            if (!VerifyPayOsSignature(payload.Data, checksumKey, payload.Signature))
            {
                logger.LogWarning("Webhook PayOS bị sai chữ ký bảo mật checksum.");
                return BadRequest(new { code = "02", desc = "Chữ ký không hợp lệ." });
            }
        }

        // Xử lý khi trạng thái thanh toán thành công (code: 00 hoặc desc: success)
        if (payload.Code == "00" || string.Equals(payload.Desc, "success", StringComparison.OrdinalIgnoreCase))
        {
            var rawOrderCode = payload.Data.OrderCode.ToString();
            var desc = payload.Data.Description?.Trim() ?? "";
            var targetCode = !string.IsNullOrEmpty(desc) && desc.StartsWith("ORD", StringComparison.OrdinalIgnoreCase)
                ? desc
                : rawOrderCode;

            try
            {
                var confirmation = new PaymentConfirmation(
                    targetCode,
                    payload.Data.Amount,
                    payload.Data.Reference ?? payload.Data.PaymentLinkId ?? $"PAYOS-{payload.Data.OrderCode}",
                    DateTime.UtcNow
                );
                await paymentReceiver.ConfirmPaymentAsync(confirmation, ct);
                logger.LogInformation("Đã xác nhận thanh toán PayOS thành công cho đơn {Code}", targetCode);

                // Phát tín hiệu SignalR Realtime tới TransactionHub cho Live Dashboard và Admin
                await BroadcastTransactionAsync(targetCode, confirmation, ct);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Lỗi đối soát thanh toán PayOS webhook cho đơn {Code}", targetCode);
            }
        }

        return Ok(new { code = "00", desc = "success" });
    }

    // Xác nhận thanh toán thủ công phục vụ kiểm thử đơn hàng khi chưa nối webhook thực tế
    [HttpPost("{code}/confirm-payment")]
    public Task<IActionResult> ConfirmPayment(string code, CancellationToken ct) =>
        Handle(async () =>
        {
            var order = await service.GetAsync(UserId, code, ct);
            if (order.TotalAmount > 0 && order.PaidAt == null)
            {
                var confirmation = new PaymentConfirmation(
                    code,
                    order.TotalAmount,
                    $"MANUAL-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    DateTime.UtcNow
                );
                await paymentReceiver.ConfirmPaymentAsync(confirmation, ct);
                await BroadcastTransactionAsync(code, confirmation, ct);
            }
            return await service.GetAsync(UserId, code, ct);
        });

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

    // Phát tín hiệu SignalR Realtime tới TransactionHub cho Ban tổ chức / Admin
    private async Task BroadcastTransactionAsync(string code, PaymentConfirmation confirmation, CancellationToken ct)
    {
        try
        {
            var order = await repository.GetOrderAsync(code, ct);
            if (order != null)
            {
                var txPayload = new
                {
                    id = order.Id,
                    orderId = order.Id,
                    eventId = order.EventId,
                    transactionCode = order.TransactionCode ?? confirmation.Reference,
                    amount = confirmation.Amount,
                    paymentMethod = order.PaymentMethod ?? "VietQR",
                    status = "Success",
                    createdAt = DateTime.UtcNow,
                    buyerEmail = order.User?.Email ?? "N/A",
                    eventTitle = order.Event?.Title ?? "N/A"
                };
                await transactionHub.Clients.All.SendAsync("ReceiveNewTransaction", txPayload, ct);
                logger.LogInformation("Đã phát tín hiệu SignalR ReceiveNewTransaction cho đơn {Code}", code);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Không thể phát tín hiệu SignalR ReceiveNewTransaction cho đơn {Code}", code);
        }
    }

    // Kiểm tra tính hợp lệ chữ ký số HMAC-SHA256 từ webhook PayOS
    private static bool VerifyPayOsSignature(PayOSWebhookData data, string checksumKey, string signature)
    {
        try
        {
            var pairs = new SortedDictionary<string, string>();
            if (data.Amount > 0) pairs["amount"] = data.Amount.ToString("0");
            if (!string.IsNullOrEmpty(data.CancelUrl)) pairs["cancelUrl"] = data.CancelUrl;
            if (!string.IsNullOrEmpty(data.Description)) pairs["description"] = data.Description;
            if (data.OrderCode > 0) pairs["orderCode"] = data.OrderCode.ToString();
            if (!string.IsNullOrEmpty(data.Reference)) pairs["reference"] = data.Reference;
            if (!string.IsNullOrEmpty(data.ReturnUrl)) pairs["returnUrl"] = data.ReturnUrl;

            var raw = string.Join("&", pairs.Select(kv => $"{kv.Key}={kv.Value}"));
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(checksumKey));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(raw));
            var calculated = Convert.ToHexString(hash).ToLowerInvariant();
            return string.Equals(calculated, signature, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
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
            : bytes.Length >= 3 && bytes[0] == 255 && bytes[1] == 216 && bytes[2] == 255 ? "image/jpeg"
            : bytes.Length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P' ? "image/webp" : null;
        if (contentType == null) throw new BookingException(400, "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
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

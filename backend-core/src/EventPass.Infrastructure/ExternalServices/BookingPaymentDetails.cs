using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using EventPass.Application.DTOs.Bookings;
using EventPass.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EventPass.Infrastructure.ExternalServices;

public class BookingPaymentDetails(IConfiguration configuration, ILogger<BookingPaymentDetails> logger) : IBookingPaymentDetails
{
    private static readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(6) };
    private static readonly ConcurrentDictionary<string, (BookingPaymentDto Payment, DateTime ExpiresAt)> _cache = new();

    private string PayOsClientId => configuration["PayOS:ClientId"] ?? "";
    private string PayOsApiKey => configuration["PayOS:ApiKey"] ?? "";
    private string PayOsChecksumKey => configuration["PayOS:ChecksumKey"] ?? "";

    // Kiểm tra đã cấu hình đủ ClientId, ApiKey, ChecksumKey của PayOS
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(PayOsClientId) &&
        !string.IsNullOrWhiteSpace(PayOsApiKey) &&
        !string.IsNullOrWhiteSpace(PayOsChecksumKey);

    // Khởi tạo thông tin thanh toán trực tuyến qua cổng PayOS
    public BookingPaymentDto Create(string code, decimal amount)
    {
        // 1. Dùng lại kết quả trong bộ nhớ đệm khi giao diện polling gọi lặp lại
        if (_cache.TryGetValue(code, out var cached) && cached.ExpiresAt > DateTime.UtcNow)
        {
            return cached.Payment;
        }

        // 2. Kiểm tra cấu hình khóa PayOS
        if (!IsConfigured)
        {
            throw new BookingException(503, "Thanh toán trực tuyến chưa cấu hình PayOS (ClientId, ApiKey, ChecksumKey).");
        }

        // 3. Tạo link thanh toán qua PayOS và lưu vào bộ nhớ đệm
        var payment = CreatePayOsLink(code, amount);
        _cache[code] = (payment, DateTime.UtcNow.AddMinutes(15));
        return payment;
    }

    // Tạo link thanh toán trực tiếp qua PayOS API v2
    private BookingPaymentDto CreatePayOsLink(string code, decimal amount)
    {
        // Tạo orderCode số nguyên dương duy nhất theo quy định PayOS (< 9007199254740991)
        long payOsOrderCode;
        var digits = new string(code.Where(char.IsDigit).ToArray());
        if (digits.Length >= 8 && long.TryParse(digits, out var parsed) && parsed <= 9007199254740991L)
        {
            payOsOrderCode = parsed;
        }
        else
        {
            payOsOrderCode = Math.Abs(BitConverter.ToInt64(MD5.HashData(Encoding.UTF8.GetBytes(code)), 0)) % 9000000000000000L + 1000000000000L;
        }

        var amountInt = (int)amount;
        var desc = code.Length <= 25 ? code : code[..25];
        var returnUrl = configuration["PayOS:ReturnUrl"] ?? "http://localhost:3000/events";
        var cancelUrl = configuration["PayOS:CancelUrl"] ?? "http://localhost:3000/events";

        // Chuỗi ký HMAC-SHA256 theo thứ tự alphabet các trường: amount, cancelUrl, description, orderCode, returnUrl
        var dataToSign = $"amount={amountInt}&cancelUrl={cancelUrl}&description={desc}&orderCode={payOsOrderCode}&returnUrl={returnUrl}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(PayOsChecksumKey));
        var signature = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(dataToSign))).ToLowerInvariant();

        // Thời điểm hết hạn link thanh toán (10 phút)
        var expiredAt = DateTimeOffset.UtcNow.AddMinutes(10).ToUnixTimeSeconds();

        // Nội dung yêu cầu gửi tới PayOS
        var payload = new
        {
            orderCode = payOsOrderCode,
            amount = amountInt,
            description = desc,
            cancelUrl,
            returnUrl,
            expiredAt,
            signature
        };

        // Gửi yêu cầu tạo link thanh toán tới PayOS
        var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api-merchant.payos.vn/v2/payment-requests")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        requestMessage.Headers.Add("x-client-id", PayOsClientId);
        requestMessage.Headers.Add("x-api-key", PayOsApiKey);

        string body;
        try
        {
            using var response = _httpClient.Send(requestMessage);
            using var reader = new StreamReader(response.Content.ReadAsStream(), Encoding.UTF8);
            body = reader.ReadToEnd();
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("PayOS API trả mã HTTP {StatusCode} cho đơn {Code}: {Body}", (int)response.StatusCode, code, body);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Không gọi được PayOS cho đơn {Code}.", code);
            throw new BookingException(503, "Không kết nối được cổng thanh toán PayOS. Vui lòng kiểm tra mạng rồi thử lại.");
        }

        // Đọc phản hồi từ PayOS
        try
        {
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            var payOsCode = root.TryGetProperty("code", out var codeProp) ? codeProp.ToString() : null;
            var payOsDesc = root.TryGetProperty("desc", out var descProp) ? descProp.ToString() : null;

            // Phản hồi thành công: lấy thông tin tài khoản nhận tiền, link và mã QR
            if (payOsCode == "00" && root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                var bin = Text(data, "bin") ?? "";
                var accNumber = Text(data, "accountNumber") ?? "";
                var accName = Text(data, "accountName") ?? "";
                var memo = Text(data, "description") ?? code;
                var checkoutUrl = Text(data, "checkoutUrl");
                var qrCode = Text(data, "qrCode");

                if (string.IsNullOrEmpty(qrCode))
                {
                    logger.LogWarning("PayOS tạo link cho đơn {Code} nhưng không trả mã QR: {Body}", code, body);
                    throw new BookingException(502, "PayOS không trả về mã QR thanh toán. Vui lòng thử lại.");
                }

                // Dựng ảnh QR từ chuỗi VietQR của PayOS
                var qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={Uri.EscapeDataString(qrCode)}";
                return new BookingPaymentDto(bin, accNumber, accName, memo, amount, qrUrl, checkoutUrl);
            }

            // Phản hồi không thành công: ghi log và trả lỗi kèm mã lỗi PayOS
            logger.LogWarning("PayOS từ chối tạo link cho đơn {Code}: code={PayOsCode}, desc={PayOsDesc}", code, payOsCode, payOsDesc);
            throw new BookingException(502,
                $"PayOS chưa tạo được phiên thanh toán (mã {payOsCode ?? "không rõ"}: {payOsDesc ?? "không có mô tả"}). " +
                "Nếu vừa khởi động lại backend, hãy hủy đơn này và đặt lại.");
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "Phản hồi PayOS không phải JSON hợp lệ cho đơn {Code}: {Body}", code, body);
            throw new BookingException(502, "Phản hồi từ PayOS không hợp lệ. Vui lòng thử lại.");
        }
    }

    // Đọc trường chuỗi trong phản hồi PayOS
    private static string? Text(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
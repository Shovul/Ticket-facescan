using System.Diagnostics;
using EventPass.Application.DTOs.Kiosk;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;
using Microsoft.Extensions.Logging;
using Pgvector;

namespace EventPass.Application.Services;

public class KioskService : IKioskService
{
    private readonly IAiServiceClient _aiServiceClient;
    private readonly ITicketDetailRepository _ticketDetailRepo;
    private readonly ICheckinLogRepository _checkinLogRepo;
    private readonly IKioskNotificationService _notificationService;
    private readonly ILogger<KioskService> _logger;

    // Ngưỡng Cosine Distance cho Facenet512: d <= 0.35 xem như cùng một người (tương đồng >= 65%)
    private const double FaceMatchCosineThreshold = 0.35;

    public KioskService(
        IAiServiceClient aiServiceClient,
        ITicketDetailRepository ticketDetailRepo,
        ICheckinLogRepository checkinLogRepo,
        IKioskNotificationService notificationService,
        ILogger<KioskService> logger)
    {
        _aiServiceClient = aiServiceClient;
        _ticketDetailRepo = ticketDetailRepo;
        _checkinLogRepo = checkinLogRepo;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task<KioskCheckinResponse> CheckinByFaceAsync(
        int eventId, 
        string kioskName, 
        Stream imageStream, 
        string fileName, 
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();

        // 1. Gửi ảnh sang AI Service để trích xuất vector 512 & kiểm tra chống giả mạo MiniFASNet
        var aiResult = await _aiServiceClient.ExtractFaceEmbeddingAsync(
            imageStream, 
            fileName, 
            enforceDetection: true, 
            antiSpoofing: true, 
            cancellationToken);

        // 2. Xử lý trường hợp AI phát hiện giả mạo hoặc lỗi chất lượng
        if (!aiResult.Success || aiResult.Embedding == null || aiResult.Embedding.Count != 512)
        {
            stopwatch.Stop();

            // Trường hợp phát hiện tấn công giả mạo (Anti-Spoofing MiniFASNet)
            if (aiResult.ErrorCode == "SPOOF_DETECTED" || (aiResult.Liveness != null && !aiResult.Liveness.IsReal))
            {
                await _checkinLogRepo.AddLogAsync(new CheckinLog
                {
                    EventId = eventId,
                    KioskName = kioskName,
                    Status = "SPOOF_DETECTED",
                    FaceConfidence = aiResult.Liveness?.Score,
                    Notes = "Phát hiện giả mạo khuôn mặt (màn hình/ảnh in)."
                }, cancellationToken);

                var spoofResponse = new KioskCheckinResponse
                {
                    Success = false,
                    StatusCode = "SPOOF_DETECTED",
                    Message = "Cảnh báo: Phát hiện khuôn mặt giả mạo hoặc chụp lại từ màn hình điện thoại!",
                    BorderColor = "#EF4444",
                    TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
                };

                await _notificationService.NotifyCheckinAsync(eventId, spoofResponse);
                return spoofResponse;
            }

            // Trường hợp không tìm thấy khuôn mặt
            if (aiResult.ErrorCode == "NO_FACE_DETECTED")
            {
                return new KioskCheckinResponse
                {
                    Success = false,
                    StatusCode = "NO_FACE",
                    Message = "Vui lòng đứng thẳng, nhìn thẳng vào camera để quét khuôn mặt.",
                    BorderColor = "#EF4444",
                    TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
                };
            }

            // Trường hợp ảnh mờ hoặc quá tối/sáng (FIQA)
            if (aiResult.ErrorCode == "POOR_QUALITY")
            {
                return new KioskCheckinResponse
                {
                    Success = false,
                    StatusCode = "QUALITY_LOW",
                    Message = aiResult.ErrorMessage ?? "Chất lượng ảnh chưa đạt yêu cầu. Vui lòng căn chỉnh ánh sáng và đứng lại gần camera.",
                    BorderColor = "#F59E0B",
                    TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
                };
            }

            // Các lỗi kỹ thuật khác
            return new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "AI_ERROR",
                Message = aiResult.ErrorMessage ?? "Lỗi xử lý nhận diện khuôn mặt.",
                BorderColor = "#EF4444",
                TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
            };
        }

        // 3. Khởi tạo Pgvector.Vector 512 chiều từ kết quả DeepFace Facenet512
        var queryVector = new Vector(aiResult.Embedding.ToArray());

        // 4. Tìm kiếm 1:N siêu tốc trên PostgreSQL pgvector với HNSW Index
        var nearestMatch = await _ticketDetailRepo.FindNearestMatchAsync(eventId, queryVector, cancellationToken);

        // 5. Kiểm tra khoảng cách Cosine Distance
        if (nearestMatch == null || nearestMatch.Value.Ticket == null || nearestMatch.Value.Distance > FaceMatchCosineThreshold)
        {
            stopwatch.Stop();

            await _checkinLogRepo.AddLogAsync(new CheckinLog
            {
                EventId = eventId,
                KioskName = kioskName,
                Status = "NOT_FOUND",
                MatchDistance = nearestMatch?.Distance,
                FaceConfidence = aiResult.Liveness?.Score,
                Notes = "Không tìm thấy vé hợp lệ tương ứng trong sự kiện."
            }, cancellationToken);

            var notFoundResponse = new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "NOT_FOUND",
                Message = "Không tìm thấy vé hợp lệ tương ứng với khuôn mặt của bạn.",
                BorderColor = "#EF4444",
                MatchDistance = nearestMatch?.Distance,
                TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
            };

            await _notificationService.NotifyCheckinAsync(eventId, notFoundResponse);
            return notFoundResponse;
        }

        // 6. Đã tìm thấy vé khớp! Phân tích trạng thái vé
        var ticket = nearestMatch.Value.Ticket;
        var distance = nearestMatch.Value.Distance;
        var similarityPercent = Math.Round(Math.Max(0, (1.0 - distance)) * 100, 2);

        // Trường hợp vé ĐÃ VÀO CỔNG (Duplicate Check-in)
        if (ticket.Status == TicketDetailStatus.CheckedIn)
        {
            stopwatch.Stop();

            await _checkinLogRepo.AddLogAsync(new CheckinLog
            {
                TicketDetailId = ticket.Id,
                EventId = eventId,
                KioskName = kioskName,
                Status = "DUPLICATE",
                MatchDistance = distance,
                FaceConfidence = aiResult.Liveness?.Score,
                Notes = $"Cảnh báo: Vé đã vào cổng trước đó vào lúc {ticket.CheckedInAt:HH:mm:ss dd/MM/yyyy}."
            }, cancellationToken);

            var duplicateResponse = new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "DUPLICATE",
                Message = $"Cảnh báo vé trùng lặp: Vé này đã được check-in vào lúc {ticket.CheckedInAt?.ToLocalTime():HH:mm:ss dd/MM/yyyy}!",
                BorderColor = "#EF4444",
                TicketCode = ticket.TicketCode,
                AttendeeName = ticket.AttendeeName,
                AttendeeEmail = ticket.AttendeeEmail,
                TicketTypeName = ticket.Ticket?.Name ?? "Vé Sự Kiện",
                MatchDistance = distance,
                SimilarityPercent = similarityPercent,
                CheckedInAt = ticket.CheckedInAt,
                TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
            };

            await _notificationService.NotifyCheckinAsync(eventId, duplicateResponse);
            return duplicateResponse;
        }

        // Trường hợp vé bị Ban Tổ Chức hủy
        if (ticket.Status == TicketDetailStatus.Cancelled)
        {
            stopwatch.Stop();

            await _checkinLogRepo.AddLogAsync(new CheckinLog
            {
                TicketDetailId = ticket.Id,
                EventId = eventId,
                KioskName = kioskName,
                Status = "CANCELLED",
                MatchDistance = distance,
                Notes = "Vé đã bị hủy bỏ bởi Ban Tổ Chức."
            }, cancellationToken);

            return new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "CANCELLED",
                Message = "Tấm vé này đã bị hủy bỏ bởi Ban Tổ Chức.",
                BorderColor = "#EF4444",
                TicketCode = ticket.TicketCode,
                AttendeeName = ticket.AttendeeName,
                TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
            };
        }

        // 7. Vé HỢP LỆ (Valid) -> Thực hiện Check-in thành công!
        ticket.Status = TicketDetailStatus.CheckedIn;
        ticket.CheckedInAt = DateTime.UtcNow;

        await _ticketDetailRepo.UpdateAsync(ticket);
        await _ticketDetailRepo.SaveChangesAsync();

        await _checkinLogRepo.AddLogAsync(new CheckinLog
        {
            TicketDetailId = ticket.Id,
            EventId = eventId,
            KioskName = kioskName,
            Status = "VALID",
            MatchDistance = distance,
            FaceConfidence = aiResult.Liveness?.Score,
            Notes = $"Điểm danh thành công lúc {ticket.CheckedInAt:HH:mm:ss dd/MM/yyyy} tại {kioskName}."
        }, cancellationToken);

        stopwatch.Stop();

        var successResponse = new KioskCheckinResponse
        {
            Success = true,
            StatusCode = "SUCCESS",
            Message = $"Điểm danh thành công! Chào mừng {ticket.AttendeeName} tham dự sự kiện.",
            BorderColor = "#22C55E",
            TicketCode = ticket.TicketCode,
            AttendeeName = ticket.AttendeeName,
            AttendeeEmail = ticket.AttendeeEmail,
            TicketTypeName = ticket.Ticket?.Name ?? "Vé Tham Dự",
            MatchDistance = distance,
            SimilarityPercent = similarityPercent,
            CheckedInAt = ticket.CheckedInAt,
            TotalLatencyMs = stopwatch.Elapsed.TotalMilliseconds
        };

        // Bắn thông báo thời gian thực qua SignalR đến Kiosk và Organizer Dashboard
        await _notificationService.NotifyCheckinAsync(eventId, successResponse);

        return successResponse;
    }
}

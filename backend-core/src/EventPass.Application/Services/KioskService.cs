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
    private readonly IKioskRepository _kioskRepo;
    private readonly IKioskNotificationService _notificationService;
    private readonly ILogger<KioskService> _logger;

    // Ngưỡng Cosine Distance cho Facenet512: d <= 0.35 xem như cùng một người (tương đồng >= 65%)
    private const double FaceMatchCosineThreshold = 0.35;

    public KioskService(
        IAiServiceClient aiServiceClient,
        ITicketDetailRepository ticketDetailRepo,
        ICheckinLogRepository checkinLogRepo,
        IKioskRepository kioskRepo,
        IKioskNotificationService notificationService,
        ILogger<KioskService> logger)
    {
        _aiServiceClient = aiServiceClient;
        _ticketDetailRepo = ticketDetailRepo;
        _checkinLogRepo = checkinLogRepo;
        _kioskRepo = kioskRepo;
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
        var totalStopwatch = Stopwatch.StartNew();

        // 1. Đo thời gian gọi AI Service
        var swAi = Stopwatch.StartNew();
        var aiResult = await _aiServiceClient.ExtractFaceEmbeddingAsync(
            imageStream, 
            fileName, 
            enforceDetection: true, 
            antiSpoofing: true, 
            cancellationToken);
        swAi.Stop();
        _logger.LogInformation("⏱️ [PROFILER] 1. AI Service (Facenet512 + AntiSpoof) tốn: {Ms} ms", swAi.ElapsedMilliseconds);

        // 2. Xử lý trường hợp AI phát hiện giả mạo hoặc lỗi chất lượng
        if (!aiResult.Success || aiResult.Embedding == null || aiResult.Embedding.Count != 512)
        {
            totalStopwatch.Stop();

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
                    TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
                };

                await _notificationService.NotifyCheckinAsync(eventId, spoofResponse);
                return spoofResponse;
            }

            if (aiResult.ErrorCode == "NO_FACE_DETECTED")
            {
                return new KioskCheckinResponse
                {
                    Success = false,
                    StatusCode = "NO_FACE",
                    Message = "Vui lòng đứng thẳng, nhìn thẳng vào camera để quét khuôn mặt.",
                    BorderColor = "#EF4444",
                    TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
                };
            }

            if (aiResult.ErrorCode == "POOR_QUALITY")
            {
                return new KioskCheckinResponse
                {
                    Success = false,
                    StatusCode = "QUALITY_LOW",
                    Message = aiResult.ErrorMessage ?? "Chất lượng ảnh chưa đạt yêu cầu. Vui lòng căn chỉnh ánh sáng và đứng lại gần camera.",
                    BorderColor = "#F59E0B",
                    TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
                };
            }

            return new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "AI_ERROR",
                Message = aiResult.ErrorMessage ?? "Lỗi xử lý nhận diện khuôn mặt.",
                BorderColor = "#EF4444",
                TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
            };
        }

        // 3. Khởi tạo Pgvector.Vector 512 chiều từ kết quả DeepFace Facenet512
        var queryVector = new Vector(aiResult.Embedding.ToArray());

        // 4. Đo thời gian truy vấn 1:N PostgreSQL pgvector HNSW Index
        var swDb = Stopwatch.StartNew();
        var nearestMatch = await _ticketDetailRepo.FindNearestMatchAsync(eventId, queryVector, cancellationToken);
        swDb.Stop();
        _logger.LogInformation("⏱️ [PROFILER] 2. PostgreSQL pgvector HNSW Query tốn: {Ms} ms", swDb.ElapsedMilliseconds);

        // 5. Kiểm tra khoảng cách Cosine Distance
        if (nearestMatch == null || nearestMatch.Value.Ticket == null || nearestMatch.Value.Distance > FaceMatchCosineThreshold)
        {
            totalStopwatch.Stop();

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
                TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
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
            var swLog = Stopwatch.StartNew();
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
            swLog.Stop();
            _logger.LogInformation("⏱️ [PROFILER] 3. Ghi log DUPLICATE vào CSDL tốn: {Ms} ms", swLog.ElapsedMilliseconds);

            totalStopwatch.Stop();
            _logger.LogInformation("⏱️ [PROFILER] === TỔNG THỜI GIAN TOÀN TRÌNH: {Ms} ms ===", totalStopwatch.ElapsedMilliseconds);

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
                TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
            };

            await _notificationService.NotifyCheckinAsync(eventId, duplicateResponse);
            return duplicateResponse;
        }

        // Trường hợp vé bị Ban Tổ Chức hủy
        if (ticket.Status == TicketDetailStatus.Cancelled)
        {
            totalStopwatch.Stop();

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
                TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
            };
        }

        // 7. Vé HỢP LỆ (Valid) -> Thực hiện Check-in thành công!
        var swUpdate = Stopwatch.StartNew();
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
        swUpdate.Stop();
        _logger.LogInformation("⏱️ [PROFILER] 3. Cập nhật vé & Ghi log VALID vào CSDL tốn: {Ms} ms", swUpdate.ElapsedMilliseconds);

        totalStopwatch.Stop();
        _logger.LogInformation("⏱️ [PROFILER] === TỔNG THỜI GIAN TOÀN TRÌNH: {Ms} ms ===", totalStopwatch.ElapsedMilliseconds);

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
            TotalLatencyMs = totalStopwatch.Elapsed.TotalMilliseconds
        };

        // Bắn thông báo thời gian thực qua SignalR đến Kiosk và Organizer Dashboard
        await _notificationService.NotifyCheckinAsync(eventId, successResponse);

        return successResponse;
    }

    /// <summary>
    /// Cứu hộ kép: Điểm danh bằng Mã vé / Quét mã QR dự phòng (Hybrid Fallback Check-in)
    /// </summary>
    public async Task<KioskCheckinResponse> CheckinByCodeAsync(
        int eventId, 
        string ticketCode, 
        string kioskName, 
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var code = (ticketCode ?? string.Empty).Trim();

        var ticket = await _ticketDetailRepo.GetByTicketCodeAsync(eventId, code, cancellationToken);
        if (ticket == null)
        {
            sw.Stop();
            await _checkinLogRepo.AddLogAsync(new CheckinLog
            {
                EventId = eventId,
                KioskName = kioskName,
                Status = "NOT_FOUND",
                Notes = $"Quét mã QR/TicketCode không tồn tại hoặc sai sự kiện: {code}"
            }, cancellationToken);

            var notFoundResponse = new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "NOT_FOUND",
                Message = "Mã vé không tồn tại hoặc không thuộc sự kiện này.",
                BorderColor = "#EF4444",
                TotalLatencyMs = sw.Elapsed.TotalMilliseconds
            };

            await _notificationService.NotifyCheckinAsync(eventId, notFoundResponse);
            return notFoundResponse;
        }

        // Kiểm tra vé đã vào cổng (Duplicate)
        if (ticket.Status == TicketDetailStatus.CheckedIn)
        {
            sw.Stop();
            await _checkinLogRepo.AddLogAsync(new CheckinLog
            {
                TicketDetailId = ticket.Id,
                EventId = eventId,
                KioskName = kioskName,
                Status = "DUPLICATE",
                Notes = $"[QR/Code] Cảnh báo: Vé đã vào cổng trước đó vào lúc {ticket.CheckedInAt:HH:mm:ss dd/MM/yyyy}."
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
                CheckedInAt = ticket.CheckedInAt,
                TotalLatencyMs = sw.Elapsed.TotalMilliseconds
            };

            await _notificationService.NotifyCheckinAsync(eventId, duplicateResponse);
            return duplicateResponse;
        }

        // Kiểm tra vé bị hủy (Cancelled)
        if (ticket.Status == TicketDetailStatus.Cancelled)
        {
            sw.Stop();
            await _checkinLogRepo.AddLogAsync(new CheckinLog
            {
                TicketDetailId = ticket.Id,
                EventId = eventId,
                KioskName = kioskName,
                Status = "CANCELLED",
                Notes = "[QR/Code] Vé đã bị hủy bỏ bởi Ban Tổ Chức."
            }, cancellationToken);

            return new KioskCheckinResponse
            {
                Success = false,
                StatusCode = "CANCELLED",
                Message = "Tấm vé này đã bị hủy bỏ bởi Ban Tổ Chức.",
                BorderColor = "#EF4444",
                TicketCode = ticket.TicketCode,
                AttendeeName = ticket.AttendeeName,
                TotalLatencyMs = sw.Elapsed.TotalMilliseconds
            };
        }

        // Vé hợp lệ -> Check-in thành công
        ticket.Status = TicketDetailStatus.CheckedIn;
        ticket.CheckedInAt = DateTime.UtcNow;
        await _ticketDetailRepo.UpdateAsync(ticket);
        await _ticketDetailRepo.SaveChangesAsync();

        await _checkinLogRepo.AddLogAsync(new CheckinLog
        {
            TicketDetailId = ticket.Id,
            EventId = eventId,
            KioskName = kioskName,
            Status = "VALID_CODE",
            Notes = $"Điểm danh thành công qua mã QR/Mã vé lúc {ticket.CheckedInAt:HH:mm:ss dd/MM/yyyy} tại {kioskName}."
        }, cancellationToken);

        sw.Stop();
        _logger.LogInformation("⏱️ [PROFILER] CheckinByCode toàn trình: {Ms} ms", sw.ElapsedMilliseconds);

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
            CheckedInAt = ticket.CheckedInAt,
            TotalLatencyMs = sw.Elapsed.TotalMilliseconds
        };

        await _notificationService.NotifyCheckinAsync(eventId, successResponse);
        return successResponse;
    }

    /// <summary>
    /// Tải danh sách vé để lưu vào Local Cache / IndexedDB trên máy Kiosk trước giờ G (Edge Cache)
    /// </summary>
    public async Task<IEnumerable<OfflineTicketDto>> GetOfflineTicketsAsync(
        int eventId, 
        CancellationToken cancellationToken = default)
    {
        var tickets = await _ticketDetailRepo.GetTicketsForOfflineSyncAsync(eventId, cancellationToken);
        return tickets.Select(t => new OfflineTicketDto
        {
            Id = t.Id,
            TicketCode = t.TicketCode,
            AttendeeName = t.AttendeeName,
            AttendeeEmail = t.AttendeeEmail,
            TicketTypeName = t.Ticket?.Name ?? "Vé Sự Kiện",
            Status = (int)t.Status,
            QrCodeUrl = t.QrCodeUrl,
            CheckedInAt = t.CheckedInAt
        });
    }

    /// <summary>
    /// Đồng bộ ngầm (Background Sync) các lượt quét ngoại tuyến khi trạm Kiosk có mạng trở lại
    /// </summary>
    public async Task<int> SyncOfflineLogsAsync(
        int eventId, 
        string kioskName, 
        List<OfflineLogItem> logs, 
        CancellationToken cancellationToken = default)
    {
        if (logs == null || logs.Count == 0)
            return 0;

        var logsToInsert = new List<CheckinLog>();
        var syncedCount = 0;

        foreach (var item in logs)
        {
            if (string.IsNullOrWhiteSpace(item.TicketCode))
                continue;

            var ticket = await _ticketDetailRepo.GetByTicketCodeAsync(eventId, item.TicketCode.Trim(), cancellationToken);
            if (ticket != null)
            {
                var incomingTime = item.CapturedAt.ToUniversalTime();

                if (ticket.Status != TicketDetailStatus.CheckedIn)
                {
                    ticket.Status = TicketDetailStatus.CheckedIn;
                    ticket.CheckedInAt = incomingTime;
                    await _ticketDetailRepo.UpdateAsync(ticket);
                    syncedCount++;

                    logsToInsert.Add(new CheckinLog
                    {
                        TicketDetailId = ticket.Id,
                        EventId = eventId,
                        KioskName = kioskName,
                        CapturedAt = incomingTime,
                        Status = "VALID_OFFLINE",
                        Notes = $"Đồng bộ ngoại tuyến ({item.CheckinMethod}) từ {kioskName}. {item.Notes ?? ""}".Trim()
                    });
                }
                else
                {
                    // Thuật toán đối soát xung đột phân tán theo Timestamp (Timestamp-based Conflict Resolution):
                    // Xác định chính xác ai quét trước là hợp lệ, ai quét sau là trùng lặp gian lận
                    var existingTime = ticket.CheckedInAt ?? DateTime.UtcNow;

                    if (incomingTime < existingTime)
                    {
                        // Lượt quét này diễn ra SỚM HƠN lượt đã lưu trước đó -> Đây mới là lượt check-in gốc hợp lệ
                        ticket.CheckedInAt = incomingTime;
                        await _ticketDetailRepo.UpdateAsync(ticket);

                        logsToInsert.Add(new CheckinLog
                        {
                            TicketDetailId = ticket.Id,
                            EventId = eventId,
                            KioskName = kioskName,
                            CapturedAt = incomingTime,
                            Status = "VALID_OFFLINE",
                            Notes = $"[HỢP LỆ GỐC] Lượt quét ngoại tuyến tại {kioskName} diễn ra sớm hơn ({incomingTime:HH:mm:ss}) so với lượt ghi nhận trước đó ({existingTime:HH:mm:ss})."
                        });
                    }
                    else
                    {
                        // Lượt quét này diễn ra MUỘN HƠN -> Xác định chính xác đây là lượt quét trùng lặp gian lận!
                        logsToInsert.Add(new CheckinLog
                        {
                            TicketDetailId = ticket.Id,
                            EventId = eventId,
                            KioskName = kioskName,
                            CapturedAt = incomingTime,
                            Status = "CONFLICT_DUPLICATE",
                            Notes = $"[CẢNH BÁO XUNG ĐỘT GIAN LẬN] Vé đã được check-in sớm hơn lúc {existingTime:HH:mm:ss dd/MM/yyyy}, nhưng bị quét lại ngoại tuyến tại {kioskName} lúc {incomingTime:HH:mm:ss}."
                        });
                    }
                }
            }
            else
            {
                logsToInsert.Add(new CheckinLog
                {
                    EventId = eventId,
                    KioskName = kioskName,
                    CapturedAt = item.CapturedAt.ToUniversalTime(),
                    Status = "OFFLINE_UNMATCHED",
                    Notes = $"Đồng bộ ngoại tuyến không khớp mã vé: {item.TicketCode} ({item.CheckinMethod})"
                });
            }
        }

        await _ticketDetailRepo.SaveChangesAsync();

        if (logsToInsert.Count > 0)
        {
            await _checkinLogRepo.AddRangeLogsAsync(logsToInsert, cancellationToken);
        }

        // Bắn SignalR thông báo đồng bộ xong để Dashboard cập nhật số lượng
        await _notificationService.NotifyCheckinAsync(eventId, new
        {
            Action = "OFFLINE_SYNC_COMPLETED",
            EventId = eventId,
            KioskName = kioskName,
            SyncedCount = syncedCount,
            TotalLogs = logs.Count,
            Timestamp = DateTime.UtcNow
        });

        return syncedCount;
    }

    /// <summary>
    /// Phát tín hiệu SignalR từ xa yêu cầu trạm Kiosk giải phóng / xóa sạch bộ nhớ Cache tức thì
    /// </summary>
    public async Task<bool> NotifyPurgeCacheAsync(
        int eventId, 
        string? reason = null, 
        CancellationToken cancellationToken = default)
    {
        await _notificationService.NotifyPurgeCacheAsync(eventId, reason);
        _logger.LogInformation("📢 Đã phát lệnh SignalR giải phóng Cache cho sự kiện {EventId}. Lý do: {Reason}", eventId, reason ?? "Admin triggered");
        return true;
    }

    /// <summary>
    /// Lấy thông tin cấu hình và thống kê vé phục vụ màn hình Kiosk khởi động
    /// </summary>
    public async Task<KioskEventInfoDto?> GetEventInfoAsync(int eventId, CancellationToken cancellationToken = default)
    {
        var summary = await _ticketDetailRepo.GetEventKioskSummaryAsync(eventId, cancellationToken);
        if (summary.Event == null)
            return null;

        var ev = summary.Event;
        return new KioskEventInfoDto
        {
            Id = ev.Id,
            Title = ev.Title,
            Description = ev.Description,
            Location = ev.Location,
            StartTime = ev.StartTime,
            EndTime = ev.EndTime,
            CoverImage = ev.CoverImage,
            IsFaceRecognitionEnabled = ev.IsFaceRecognitionEnabled,
            IsQrEnabled = ev.IsQrEnabled,
            TotalTickets = summary.TotalTickets,
            CheckedInCount = summary.CheckedInCount
        };
    }

    /// <summary>
    /// Xác thực khóa bí mật X-Kiosk-Secret-Key thực tế từ cơ sở dữ liệu (BR03 / BR05)
    /// </summary>
    public async Task<VerifyKioskTokenResponse> VerifySecretTokenAsync(
        int eventId, 
        string secretToken, 
        CancellationToken cancellationToken = default)
    {
        if (eventId <= 0 || string.IsNullOrWhiteSpace(secretToken))
        {
            return new VerifyKioskTokenResponse
            {
                Success = false,
                Message = "Thông tin mã sự kiện hoặc mã khóa bí mật Kiosk không hợp lệ."
            };
        }

        var kiosk = await _kioskRepo.GetBySecretTokenAsync(eventId, secretToken, cancellationToken);
        if (kiosk == null)
        {
            _logger.LogWarning("⚠️ Xác thực thất bại cho Kiosk sự kiện {EventId} với token '{Token}'", eventId, secretToken);
            return new VerifyKioskTokenResponse
            {
                Success = false,
                Message = "Mã bí mật Kiosk (X-Kiosk-Secret-Key) không chính xác hoặc trạm đã bị vô hiệu hóa."
            };
        }

        _logger.LogInformation("✅ Kích hoạt thành công trạm Kiosk '{KioskName}' (ID: {KioskId}) cho sự kiện {EventId}", kiosk.Name, kiosk.Id, eventId);
        return new VerifyKioskTokenResponse
        {
            Success = true,
            KioskId = kiosk.Id,
            KioskName = kiosk.Name,
            EventTitle = kiosk.Event?.Title,
            Message = $"Xác thực trạm '{kiosk.Name}' thành công."
        };
    }
}

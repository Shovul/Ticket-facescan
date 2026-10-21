using EventPass.API.Hubs;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace EventPass.API.Services;

public class KioskNotificationService : IKioskNotificationService
{
    private readonly IHubContext<KioskHub> _hubContext;
    private readonly ILogger<KioskNotificationService> _logger;

    public KioskNotificationService(IHubContext<KioskHub> hubContext, ILogger<KioskNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyCheckinAsync(int eventId, object checkinEvent)
    {
        try
        {
            var groupName = $"event_{eventId}";
            await _hubContext.Clients.Group(groupName).SendAsync("ReceiveCheckinUpdate", checkinEvent);
            // Cũng bắn ra broadcast chung để các màn hình giám sát tổng tiếp nhận
            await _hubContext.Clients.All.SendAsync("GlobalCheckinUpdate", checkinEvent);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể gửi sự kiện SignalR tới Kiosk/Dashboard: {Message}", ex.Message);
        }
    }

    public async Task NotifyPurgeCacheAsync(int eventId, string? reason = null)
    {
        try
        {
            var groupName = $"event_{eventId}";
            var payload = new
            {
                EventId = eventId,
                Action = "PURGE_CACHE",
                Timestamp = DateTime.UtcNow,
                Reason = reason ?? "Admin triggered cache clear"
            };
            await _hubContext.Clients.Group(groupName).SendAsync("ReceivePurgeCache", payload);
            await _hubContext.Clients.All.SendAsync("GlobalPurgeCache", payload);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể gửi sự kiện SignalR PurgeCache: {Message}", ex.Message);
        }
    }
}

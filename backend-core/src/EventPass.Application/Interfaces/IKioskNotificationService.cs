namespace EventPass.Application.Interfaces;

public interface IKioskNotificationService
{
    Task NotifyCheckinAsync(int eventId, object checkinEvent);
    Task NotifyPurgeCacheAsync(int eventId, string? reason = null);
}

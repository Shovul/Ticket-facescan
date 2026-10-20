namespace EventPass.Application.Interfaces;

public interface IKioskNotificationService
{
    Task NotifyCheckinAsync(int eventId, object checkinEvent);
}

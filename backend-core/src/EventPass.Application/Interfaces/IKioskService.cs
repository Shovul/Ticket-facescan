using EventPass.Application.DTOs.Kiosk;

namespace EventPass.Application.Interfaces;

public interface IKioskService
{
    Task<KioskCheckinResponse> CheckinByFaceAsync(
        int eventId, 
        string kioskName, 
        Stream imageStream, 
        string fileName, 
        CancellationToken cancellationToken = default);
}

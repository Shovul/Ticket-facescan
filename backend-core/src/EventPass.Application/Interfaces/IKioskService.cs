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

    Task<KioskCheckinResponse> CheckinByCodeAsync(
        int eventId, 
        string ticketCode, 
        string kioskName, 
        CancellationToken cancellationToken = default);

    Task<IEnumerable<OfflineTicketDto>> GetOfflineTicketsAsync(
        int eventId, 
        CancellationToken cancellationToken = default);

    Task<int> SyncOfflineLogsAsync(
        int eventId, 
        string kioskName, 
        List<OfflineLogItem> logs, 
        CancellationToken cancellationToken = default);

    Task<bool> NotifyPurgeCacheAsync(
        int eventId, 
        string? reason = null, 
        CancellationToken cancellationToken = default);

    Task<KioskEventInfoDto?> GetEventInfoAsync(
        int eventId, 
        CancellationToken cancellationToken = default);
}

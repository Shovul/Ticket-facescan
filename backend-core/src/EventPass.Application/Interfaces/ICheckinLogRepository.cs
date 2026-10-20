using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces;

public interface ICheckinLogRepository
{
    Task AddLogAsync(CheckinLog log, CancellationToken cancellationToken = default);
    Task<IEnumerable<CheckinLog>> GetRecentLogsByEventAsync(int eventId, int limit = 50, CancellationToken cancellationToken = default);
}

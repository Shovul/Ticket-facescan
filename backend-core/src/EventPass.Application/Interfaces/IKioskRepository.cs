using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces;

public interface IKioskRepository : IRepository<Kiosk>
{
    Task<Kiosk?> GetBySecretTokenAsync(int eventId, string secretToken, CancellationToken cancellationToken = default);
    Task<IEnumerable<Kiosk>> GetByEventIdAsync(int eventId, CancellationToken cancellationToken = default);
}

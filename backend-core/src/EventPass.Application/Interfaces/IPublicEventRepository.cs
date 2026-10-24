using EventPass.Application.DTOs.CustomerEvents;

namespace EventPass.Application.Interfaces;

public interface IPublicEventRepository
{
    Task<PublicEventPage> GetPageAsync(PublicEventQuery query, DateTime now, CancellationToken cancellationToken);
    Task<PublicEventDto?> GetDetailAsync(int id, DateTime now, CancellationToken cancellationToken);
}

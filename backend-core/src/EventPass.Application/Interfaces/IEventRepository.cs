using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces
{
    public interface IEventRepository : IRepository<Event>
    {
        Task<Event?> GetEventWithDetailsAsync(int eventId);
    }
}
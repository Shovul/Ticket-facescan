using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces
{
    public interface ITicketRepository : IRepository<Ticket>
    {
        Task<IEnumerable<Ticket>> GetTicketsByEventIdAsync(int eventId);
    }
}
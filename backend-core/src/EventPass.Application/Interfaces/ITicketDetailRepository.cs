using EventPass.Domain.Entities;
using Pgvector;

namespace EventPass.Application.Interfaces;

public interface ITicketDetailRepository : IRepository<TicketDetail>
{
    Task<(TicketDetail? Ticket, double Distance)?> FindNearestMatchAsync(
        int eventId, 
        Vector queryVector, 
        CancellationToken cancellationToken = default);
}

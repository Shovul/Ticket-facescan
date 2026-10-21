using EventPass.Domain.Entities;
using Pgvector;

namespace EventPass.Application.Interfaces;

public interface ITicketDetailRepository : IRepository<TicketDetail>
{
    Task<(TicketDetail? Ticket, double Distance)?> FindNearestMatchAsync(
        int eventId, 
        Vector queryVector, 
        CancellationToken cancellationToken = default);

    Task<TicketDetail?> GetByTicketCodeAsync(
        int eventId, 
        string ticketCode, 
        CancellationToken cancellationToken = default);

    Task<IEnumerable<TicketDetail>> GetTicketsForOfflineSyncAsync(
        int eventId, 
        CancellationToken cancellationToken = default);

    Task<(int TotalTickets, int CheckedInCount, Event? Event)> GetEventKioskSummaryAsync(
        int eventId, 
        CancellationToken cancellationToken = default);
}

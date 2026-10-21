using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;

namespace EventPass.Infrastructure.Repositories;

public class TicketDetailRepository : Repository<TicketDetail>, ITicketDetailRepository
{
    private readonly AppDbContext _appDbContext;

    public TicketDetailRepository(AppDbContext context) : base(context)
    {
        _appDbContext = context;
    }

    public async Task<(TicketDetail? Ticket, double Distance)?> FindNearestMatchAsync(
        int eventId, 
        Vector queryVector, 
        CancellationToken cancellationToken = default)
    {
        // Truy vấn 1:N sử dụng pgvector HNSW Index (Cosine Distance)
        var candidate = await _appDbContext.TicketDetails
            .Include(td => td.Ticket)
            .Include(td => td.Event)
            .Where(td => td.EventId == eventId && td.FaceVector != null && !td.IsDeleted)
            .OrderBy(td => td.FaceVector!.CosineDistance(queryVector))
            .Select(td => new
            {
                Ticket = td,
                Distance = td.FaceVector!.CosineDistance(queryVector)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (candidate == null)
            return null;

        return (candidate.Ticket, candidate.Distance);
    }

    public async Task<TicketDetail?> GetByTicketCodeAsync(
        int eventId, 
        string ticketCode, 
        CancellationToken cancellationToken = default)
    {
        return await _appDbContext.TicketDetails
            .Include(td => td.Ticket)
            .Include(td => td.Event)
            .FirstOrDefaultAsync(td => td.EventId == eventId && td.TicketCode == ticketCode && !td.IsDeleted, cancellationToken);
    }

    public async Task<IEnumerable<TicketDetail>> GetTicketsForOfflineSyncAsync(
        int eventId, 
        CancellationToken cancellationToken = default)
    {
        return await _appDbContext.TicketDetails
            .Include(td => td.Ticket)
            .Where(td => td.EventId == eventId && !td.IsDeleted)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<(int TotalTickets, int CheckedInCount, Event? Event)> GetEventKioskSummaryAsync(
        int eventId, 
        CancellationToken cancellationToken = default)
    {
        var ev = await _appDbContext.Events.FirstOrDefaultAsync(e => e.Id == eventId && !e.IsDeleted, cancellationToken);
        if (ev == null)
            return (0, 0, null);

        var total = await _appDbContext.TicketDetails.CountAsync(td => td.EventId == eventId && !td.IsDeleted, cancellationToken);
        var checkedIn = await _appDbContext.TicketDetails.CountAsync(td => td.EventId == eventId && td.Status == EventPass.Domain.Enums.TicketDetailStatus.CheckedIn && !td.IsDeleted, cancellationToken);

        return (total, checkedIn, ev);
    }
}

using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventPass.Infrastructure.Repositories;

public class CheckinLogRepository : ICheckinLogRepository
{
    private readonly AppDbContext _context;

    public CheckinLogRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task AddLogAsync(CheckinLog log, CancellationToken cancellationToken = default)
    {
        log.CapturedAt = DateTime.UtcNow;
        await _context.CheckinLogs.AddAsync(log, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task AddRangeLogsAsync(IEnumerable<CheckinLog> logs, CancellationToken cancellationToken = default)
    {
        await _context.CheckinLogs.AddRangeAsync(logs, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<IEnumerable<CheckinLog>> GetRecentLogsByEventAsync(
        int eventId, 
        int limit = 50, 
        CancellationToken cancellationToken = default)
    {
        return await _context.CheckinLogs
            .Include(l => l.TicketDetail)
            .Where(l => l.EventId == eventId)
            .OrderByDescending(l => l.CapturedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}

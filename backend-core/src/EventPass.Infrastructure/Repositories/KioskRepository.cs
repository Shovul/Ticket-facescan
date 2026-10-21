using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventPass.Infrastructure.Repositories;

public class KioskRepository : Repository<Kiosk>, IKioskRepository
{
    public KioskRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Kiosk?> GetBySecretTokenAsync(int eventId, string secretToken, CancellationToken cancellationToken = default)
    {
        var token = secretToken.Trim();
        // Hỗ trợ kiểm tra chính xác mã hoặc fallback tiền tố stk_
        return await _context.Kiosks
            .Include(k => k.Event)
            .FirstOrDefaultAsync(k => 
                k.EventId == eventId && 
                k.IsActive && 
                !k.IsDeleted && 
                (k.SecretToken == token || (token.StartsWith("stk_") && k.SecretToken == token.Substring(4)) || (!token.StartsWith("stk_") && k.SecretToken == "stk_" + token)), 
                cancellationToken);
    }

    public async Task<IEnumerable<Kiosk>> GetByEventIdAsync(int eventId, CancellationToken cancellationToken = default)
    {
        return await _context.Kiosks
            .Where(k => k.EventId == eventId && !k.IsDeleted)
            .OrderBy(k => k.Id)
            .ToListAsync(cancellationToken);
    }
}

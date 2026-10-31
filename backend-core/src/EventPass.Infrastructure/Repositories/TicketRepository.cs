using Microsoft.EntityFrameworkCore;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;

namespace EventPass.Infrastructure.Repositories
{
    public class TicketRepository : Repository<Ticket>, ITicketRepository
    {
        public TicketRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Ticket>> GetTicketsByEventIdAsync(int eventId)
        {
            return await _dbSet
                .Where(t => t.EventId == eventId && !t.IsDeleted)
                .ToListAsync();
        }
    }
}
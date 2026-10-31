using Microsoft.EntityFrameworkCore;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;

namespace EventPass.Infrastructure.Repositories
{
    public class EventRepository : Repository<Event>, IEventRepository
    {
        public EventRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<Event?> GetEventWithDetailsAsync(int eventId)
        {
            return await _dbSet
                .Include(e => e.Tickets)
                .Include(e => e.Kiosks) 
                .FirstOrDefaultAsync(e => e.Id == eventId && !e.IsDeleted);
        }
    }
}
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventPass.Infrastructure.Repositories;

public class BookingRepository(AppDbContext db) : IBookingRepository
{
    public Task<List<Order>> GetCustomerOrdersAsync(int userId, CancellationToken ct) => Orders
        .Where(o => o.UserId == userId && o.ReservationStatus != null).OrderByDescending(o => o.CreatedAt).ToListAsync(ct);
    public Task<Order?> GetClaimOrderAsync(string tokenHash, CancellationToken ct) => Orders
        .SingleOrDefaultAsync(o => o.Items.Any(i => i.ClaimTokenHash == tokenHash), ct);

    public Task<int> CountCustomerTicketsAsync(int userId, DateTime now, CancellationToken ct) => db.TicketDetails
        .CountAsync(t => t.Order.UserId == userId && !t.Order.IsDeleted && t.Event.EndTime > now
            && t.Status != TicketDetailStatus.Cancelled && t.Status != TicketDetailStatus.Expired, ct);

    // Khóa theo sự kiện trong transaction để giữ chỗ và phát hành không vượt tồn kho.
    public async Task<T> InEventTransactionAsync<T>(int eventId, Func<Task<T>> action, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(707, {eventId})", ct);
        db.ChangeTracker.Clear();
        var result = await action();
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    public Task<Event?> GetEventAsync(int id, CancellationToken ct) => db.Events.Include(e => e.Tickets.Where(t => t.IsActive)).SingleOrDefaultAsync(e => e.Id == id, ct);
    public Task<User?> GetUserAsync(int id, CancellationToken ct) => db.Users.SingleOrDefaultAsync(u => u.Id == id, ct);
    private IQueryable<Order> Orders => db.Orders.Include(o => o.Event).Include(o => o.User)
        .Include(o => o.Items).ThenInclude(i => i.Ticket).Include(o => o.Items).ThenInclude(i => i.TicketDetail)
        .Include(o => o.Event).ThenInclude(e => e.Kiosks);
    public Task<Order?> GetOrderAsync(string code, CancellationToken ct) => Orders.SingleOrDefaultAsync(o => o.OrderCode == code, ct);
    public Task<Order?> GetRequestAsync(int userId, string key, CancellationToken ct) => Orders.SingleOrDefaultAsync(o => o.UserId == userId && o.RequestKey == key, ct);
    public Task<int> GetOrderEventIdAsync(string code, CancellationToken ct) => db.Orders.Where(o => o.OrderCode == code).Select(o => o.EventId).SingleOrDefaultAsync(ct);

    public Task<int> HeldQuantityAsync(int id, DateTime now, CancellationToken ct) => db.Set<OrderItem>()
        .CountAsync(i => i.TicketId == id && !i.IsDeleted && !i.Order.IsDeleted && i.Status == "reserved"
            && i.Order.ExpiresAt > now && (i.Order.PaidAt != null || i.Order.PaymentExpiresAt == null || i.Order.PaymentExpiresAt > now), ct);

    public async Task<List<float[]>> OtherFacesAsync(int eventId, int itemId, DateTime now, CancellationToken ct)
    {
        var issued = await db.TicketDetails.Where(t => t.EventId == eventId && !db.OrderItems.Any(i => i.Id == itemId && i.TicketDetailId == t.Id) && t.Status != TicketDetailStatus.Cancelled && t.Status != TicketDetailStatus.Expired && t.FaceVector != null)
            .Select(t => t.FaceVector!).ToListAsync(ct);
        var pending = await db.Set<OrderItem>().Where(i => !i.IsDeleted && i.Order.EventId == eventId && !i.Order.IsDeleted
            && i.Id != itemId && i.Status == "reserved" && i.FaceVector != null && i.Order.ExpiresAt > now
            && (i.Order.PaidAt != null || i.Order.PaymentExpiresAt == null || i.Order.PaymentExpiresAt > now))
            .Select(i => i.FaceVector!).ToListAsync(ct);
        return issued.Concat(pending).Select(v => v.ToArray()).ToList();
    }

    public Task<List<int>> ExpiringEventsAsync(CancellationToken ct) => db.Orders.Where(o => o.ReservationStatus == "holding" || o.ReservationStatus == "awaiting_faces")
        .Select(o => o.EventId).Distinct().ToListAsync(ct);
    public Task<List<Order>> PendingOrdersAsync(int eventId, CancellationToken ct) => Orders.Where(o => o.EventId == eventId && (o.ReservationStatus == "holding" || o.ReservationStatus == "awaiting_faces")).ToListAsync(ct);
    public Task<bool> PaymentReferenceExistsAsync(string reference, int orderId, CancellationToken ct) => db.Orders.AnyAsync(o => o.PaymentReference == reference && o.Id != orderId, ct);
    public void AddOrder(Order order) => db.Orders.Add(order);
    public void AddTicket(TicketDetail ticket) => db.TicketDetails.Add(ticket);
    public Task SaveAsync(CancellationToken ct) => db.SaveChangesAsync(ct);
    public async Task DeleteExpiredPhotosAsync(DateTime now, CancellationToken ct)
    {
        await db.OrderItems.IgnoreQueryFilters().Where(i => i.ProtectedFaceImage != null && i.Order.Event.EndTime < now.AddDays(-30))
            .ExecuteUpdateAsync(setters => setters.SetProperty(i => i.ProtectedFaceImage, (byte[]?)null)
                .SetProperty(i => i.FaceImageContentType, (string?)null), ct);
    }
}

using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces;

public interface IBookingRepository
{
    Task<int> CountCustomerTicketsAsync(int userId, DateTime now, CancellationToken ct);
    Task<T> InEventTransactionAsync<T>(int eventId, Func<Task<T>> action, CancellationToken ct);
    Task<Event?> GetEventAsync(int eventId, CancellationToken ct);
    Task<User?> GetUserAsync(int userId, CancellationToken ct);
    Task<Order?> GetOrderAsync(string code, CancellationToken ct);
    Task<Order?> GetRequestAsync(int userId, string requestKey, CancellationToken ct);
    Task<int> GetOrderEventIdAsync(string code, CancellationToken ct);
    Task<int> HeldQuantityAsync(int ticketId, DateTime now, CancellationToken ct);
    Task<List<float[]>> OtherFacesAsync(int eventId, int itemId, DateTime now, CancellationToken ct);
    Task<List<int>> ExpiringEventsAsync(CancellationToken ct);
    Task<List<Order>> PendingOrdersAsync(int eventId, CancellationToken ct);
    Task<bool> PaymentReferenceExistsAsync(string reference, int orderId, CancellationToken ct);
    void AddOrder(Order order);
    void AddTicket(TicketDetail ticket);
    Task SaveAsync(CancellationToken ct);
    Task DeleteExpiredPhotosAsync(DateTime now, CancellationToken ct);
}

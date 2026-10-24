using EventPass.Application.DTOs.CustomerEvents;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventPass.Infrastructure.Repositories;

public class PublicEventRepository(AppDbContext context) : IPublicEventRepository
{
    private const int PageSize = 6;

    // Chỉ công khai sự kiện đã cấu hình lịch và đang trong thời gian bán vé.
    private IQueryable<Event> PublicEvents(DateTime now) => context.Events.AsNoTracking()
        .Where(e => (e.Status == EventStatus.Upcoming || e.Status == EventStatus.Ongoing)
            && e.PublicTime <= now && e.OpenTicketTime <= now && e.CloseTicketTime > now
            && e.PublicTime < e.OpenTicketTime && e.OpenTicketTime < e.CloseTicketTime
            && e.CloseTicketTime <= e.StartTime && e.EndTime > e.StartTime && e.EndTime > now);

    private IQueryable<PublicEventDto> Project(IQueryable<Event> events, DateTime now) => events.Select(e => new PublicEventDto
    {
        Id = e.Id,
        Title = e.Title,
        Description = e.Description,
        CoverImage = e.CoverImage,
        Location = e.Location,
        OrganizerName = context.Users.Where(u => u.Id == e.OrganizerId).Select(u => u.FullName).FirstOrDefault(),
        OrganizerAvatarUrl = context.Users.Where(u => u.Id == e.OrganizerId).Select(u => u.AvatarUrl).FirstOrDefault(),
        StartTime = e.StartTime,
        EndTime = e.EndTime,
        RemainingQuantity = e.Tickets.Where(t => t.IsActive).Sum(t => Math.Max(0, t.Quantity - t.QuantitySold
            - context.OrderItems.Count(i => i.TicketId == t.Id && i.Status == "reserved" && i.Order.ExpiresAt > now
                && (i.Order.PaidAt != null || i.Order.PaymentExpiresAt == null || i.Order.PaymentExpiresAt > now)))),
        Tickets = e.Tickets.Where(t => t.IsActive).OrderBy(t => t.Price).ThenBy(t => t.Id)
            .Select(t => new PublicTicketDto(t.Id, t.Name, t.Price,
                Math.Max(0, t.Quantity - t.QuantitySold - context.OrderItems.Count(i => i.TicketId == t.Id && i.Status == "reserved"
                    && i.Order.ExpiresAt > now && (i.Order.PaidAt != null || i.Order.PaymentExpiresAt == null || i.Order.PaymentExpiresAt > now))))).ToList()
    });

    public async Task<PublicEventPage> GetPageAsync(PublicEventQuery query, DateTime now, CancellationToken cancellationToken)
    {
        var events = PublicEvents(now);
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            // Từ khóa được tìm như văn bản, không coi ký tự phần trăm là mẫu tìm kiếm.
            var pattern = "%" + search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            events = events.Where(e => EF.Functions.ILike(e.Title, pattern, "\\")
                || EF.Functions.ILike(e.Location, pattern, "\\")
                || context.Users.Any(u => u.Id == e.OrganizerId && EF.Functions.ILike(u.FullName, pattern, "\\")));
        }

        var count = await events.CountAsync(cancellationToken);
        var totalPages = (int)Math.Ceiling(count / (double)PageSize);
        var page = query.Page > Math.Max(1, totalPages) ? 1 : query.Page;
        var projected = Project(events, now);
        var sorted = query.Sort switch
        {
            "remaining" => projected.OrderBy(e => e.RemainingQuantity).ThenBy(e => e.Id),
            "name" => projected.OrderBy(e => e.Title).ThenBy(e => e.Id),
            _ => projected.OrderBy(e => e.StartTime).ThenBy(e => e.Id)
        };
        var items = await sorted.Skip((page - 1) * PageSize).Take(PageSize).ToListAsync(cancellationToken);
        return new PublicEventPage(items, page, PageSize, count, totalPages);
    }

    public Task<PublicEventDto?> GetDetailAsync(int id, DateTime now, CancellationToken cancellationToken) =>
        Project(PublicEvents(now).Where(e => e.Id == id), now).SingleOrDefaultAsync(cancellationToken);
}

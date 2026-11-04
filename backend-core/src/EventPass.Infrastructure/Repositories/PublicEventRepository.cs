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

    // "Chỉ công khai sự kiện đã cấu hình lịch và đang trong thời gian bán vé"
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

    // "Nhận diện các loại sự kiện dựa vào tiêu đề và mô tả"
    private static List<string> DetectCategories(string title, string? description)
    {
        var combined = $"{title} {description ?? ""}".ToLowerInvariant();
        var list = new List<string>();

        if (combined.Contains("nhạc") || combined.Contains("music") || combined.Contains("acoustic") ||
            combined.Contains("concert") || combined.Contains("festival") || combined.Contains("biểu diễn") ||
            combined.Contains("ca sĩ") || combined.Contains("âm nhạc") || combined.Contains("live") || combined.Contains("band"))
        {
            list.Add("music");
        }

        if (combined.Contains("workshop") || combined.Contains("công nghệ") || combined.Contains("tech") ||
            combined.Contains("lập trình") || combined.Contains("web") || combined.Contains("ai") ||
            combined.Contains("deepface") || combined.Contains("coding") || combined.Contains("software") ||
            combined.Contains("phần mềm") || combined.Contains("cntt"))
        {
            list.Add("workshop");
        }

        if (combined.Contains("tọa đàm") || combined.Contains("hội thảo") || combined.Contains("seminar") ||
            combined.Contains("talk") || combined.Contains("conference") || combined.Contains("diễn đàn") ||
            combined.Contains("chia sẻ") || combined.Contains("khoa học"))
        {
            list.Add("seminar");
        }

        if (combined.Contains("thể thao") || combined.Contains("sport") || combined.Contains("bóng đá") ||
            combined.Contains("chạy bộ") || combined.Contains("marathon") || combined.Contains("giải đấu") ||
            combined.Contains("cầu lông") || combined.Contains("esport"))
        {
            list.Add("sports");
        }

        if (combined.Contains("hướng nghiệp") || combined.Contains("tuyển dụng") || combined.Contains("job") ||
            combined.Contains("career") || combined.Contains("việc làm") || combined.Contains("phỏng vấn") ||
            combined.Contains("doanh nghiệp") || combined.Contains("thực tập"))
        {
            list.Add("career");
        }

        return list;
    }

    // "Tra cứu danh sách sự kiện công khai kết hợp bộ lọc nâng cao"
    public async Task<PublicEventPage> GetPageAsync(PublicEventQuery query, DateTime now, CancellationToken cancellationToken)
    {
        var events = PublicEvents(now);

        // "1. Lọc theo từ khóa tìm kiếm"
        var search = query.Search?.Trim();
        if (!string.IsNullOrEmpty(search))
        {
            var pattern = "%" + search.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            events = events.Where(e => EF.Functions.ILike(e.Title, pattern, "\\")
                || EF.Functions.ILike(e.Location, pattern, "\\")
                || context.Users.Any(u => u.Id == e.OrganizerId && EF.Functions.ILike(u.FullName, pattern, "\\")));
        }

        // "2. Lọc theo loại vé: miễn phí, có phí hoặc cả hai"
        var ticketType = query.TicketType?.Trim().ToLowerInvariant();
        if (ticketType == "free")
        {
            events = events.Where(e => e.Tickets.Any(t => t.IsActive && t.Price == 0));
        }
        else if (ticketType == "paid")
        {
            events = events.Where(e => e.Tickets.Any(t => t.IsActive && t.Price > 0));
        }
        else if (ticketType == "both")
        {
            events = events.Where(e => e.Tickets.Any(t => t.IsActive && t.Price == 0) && e.Tickets.Any(t => t.IsActive && t.Price > 0));
        }

        // "3. Lọc theo khoảng giá vé"
        if (query.MinPrice.HasValue && query.MinPrice.Value > 0)
        {
            events = events.Where(e => e.Tickets.Any(t => t.IsActive && t.Price >= query.MinPrice.Value));
        }
        if (query.MaxPrice.HasValue && query.MaxPrice.Value >= 0)
        {
            events = events.Where(e => e.Tickets.Any(t => t.IsActive && t.Price <= query.MaxPrice.Value));
        }

        // "4. Lọc theo khoảng thời gian tổ chức sự kiện"
        if (query.StartDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(query.StartDate.Value.Date, DateTimeKind.Utc);
            events = events.Where(e => e.StartTime >= startUtc);
        }
        if (query.EndDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(query.EndDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            events = events.Where(e => e.StartTime <= endUtc);
        }

        // "5. Lọc theo danh mục sự kiện"
        if (!string.IsNullOrWhiteSpace(query.Categories))
        {
            var catList = query.Categories.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(c => c.ToLowerInvariant())
                .ToList();

            if (catList.Count > 0)
            {
                events = events.Where(e =>
                    (catList.Contains("music") && (
                        EF.Functions.ILike(e.Title, "%nhạc%") || EF.Functions.ILike(e.Title, "%music%") || EF.Functions.ILike(e.Title, "%acoustic%") || EF.Functions.ILike(e.Title, "%concert%") || EF.Functions.ILike(e.Title, "%festival%") || EF.Functions.ILike(e.Title, "%biểu diễn%") ||
                        (e.Description != null && (EF.Functions.ILike(e.Description, "%nhạc%") || EF.Functions.ILike(e.Description, "%music%")))
                    ))
                    || (catList.Contains("workshop") && (
                        EF.Functions.ILike(e.Title, "%workshop%") || EF.Functions.ILike(e.Title, "%công nghệ%") || EF.Functions.ILike(e.Title, "%tech%") || EF.Functions.ILike(e.Title, "%lập trình%") || EF.Functions.ILike(e.Title, "%web%") || EF.Functions.ILike(e.Title, "%ai%") ||
                        (e.Description != null && (EF.Functions.ILike(e.Description, "%workshop%") || EF.Functions.ILike(e.Description, "%công nghệ%") || EF.Functions.ILike(e.Description, "%lập trình%")))
                    ))
                    || (catList.Contains("seminar") && (
                        EF.Functions.ILike(e.Title, "%tọa đàm%") || EF.Functions.ILike(e.Title, "%hội thảo%") || EF.Functions.ILike(e.Title, "%seminar%") || EF.Functions.ILike(e.Title, "%talk%") || EF.Functions.ILike(e.Title, "%khoa học%") ||
                        (e.Description != null && (EF.Functions.ILike(e.Description, "%tọa đàm%") || EF.Functions.ILike(e.Description, "%hội thảo%")))
                    ))
                    || (catList.Contains("sports") && (
                        EF.Functions.ILike(e.Title, "%thể thao%") || EF.Functions.ILike(e.Title, "%sport%") || EF.Functions.ILike(e.Title, "%bóng đá%") || EF.Functions.ILike(e.Title, "%chạy bộ%") || EF.Functions.ILike(e.Title, "%marathon%") ||
                        (e.Description != null && (EF.Functions.ILike(e.Description, "%thể thao%") || EF.Functions.ILike(e.Description, "%sport%")))
                    ))
                    || (catList.Contains("career") && (
                        EF.Functions.ILike(e.Title, "%hướng nghiệp%") || EF.Functions.ILike(e.Title, "%tuyển dụng%") || EF.Functions.ILike(e.Title, "%job%") || EF.Functions.ILike(e.Title, "%career%") || EF.Functions.ILike(e.Title, "%việc làm%") ||
                        (e.Description != null && (EF.Functions.ILike(e.Description, "%hướng nghiệp%") || EF.Functions.ILike(e.Description, "%tuyển dụng%")))
                    ))
                );
            }
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

        // "Gán danh mục cho từng sự kiện trả về"
        foreach (var item in items)
        {
            item.Categories = DetectCategories(item.Title, item.Description);
        }

        // "Thống kê số lượng sự kiện theo từng loại danh mục"
        var baseEvents = PublicEvents(now);
        var musicCount = await baseEvents.CountAsync(e => EF.Functions.ILike(e.Title, "%nhạc%") || EF.Functions.ILike(e.Title, "%music%") || EF.Functions.ILike(e.Title, "%acoustic%") || EF.Functions.ILike(e.Title, "%concert%") || EF.Functions.ILike(e.Title, "%festival%") || (e.Description != null && (EF.Functions.ILike(e.Description, "%nhạc%") || EF.Functions.ILike(e.Description, "%music%"))), cancellationToken);
        var workshopCount = await baseEvents.CountAsync(e => EF.Functions.ILike(e.Title, "%workshop%") || EF.Functions.ILike(e.Title, "%công nghệ%") || EF.Functions.ILike(e.Title, "%tech%") || EF.Functions.ILike(e.Title, "%lập trình%") || EF.Functions.ILike(e.Title, "%web%") || EF.Functions.ILike(e.Title, "%ai%") || (e.Description != null && (EF.Functions.ILike(e.Description, "%workshop%") || EF.Functions.ILike(e.Description, "%công nghệ%"))), cancellationToken);
        var seminarCount = await baseEvents.CountAsync(e => EF.Functions.ILike(e.Title, "%tọa đàm%") || EF.Functions.ILike(e.Title, "%hội thảo%") || EF.Functions.ILike(e.Title, "%seminar%") || EF.Functions.ILike(e.Title, "%talk%") || EF.Functions.ILike(e.Title, "%khoa học%") || (e.Description != null && (EF.Functions.ILike(e.Description, "%tọa đàm%") || EF.Functions.ILike(e.Description, "%hội thảo%"))), cancellationToken);
        var sportsCount = await baseEvents.CountAsync(e => EF.Functions.ILike(e.Title, "%thể thao%") || EF.Functions.ILike(e.Title, "%sport%") || EF.Functions.ILike(e.Title, "%bóng đá%") || EF.Functions.ILike(e.Title, "%chạy bộ%") || EF.Functions.ILike(e.Title, "%marathon%") || (e.Description != null && (EF.Functions.ILike(e.Description, "%thể thao%") || EF.Functions.ILike(e.Description, "%sport%"))), cancellationToken);
        var careerCount = await baseEvents.CountAsync(e => EF.Functions.ILike(e.Title, "%hướng nghiệp%") || EF.Functions.ILike(e.Title, "%tuyển dụng%") || EF.Functions.ILike(e.Title, "%job%") || EF.Functions.ILike(e.Title, "%career%") || EF.Functions.ILike(e.Title, "%việc làm%") || (e.Description != null && (EF.Functions.ILike(e.Description, "%hướng nghiệp%") || EF.Functions.ILike(e.Description, "%tuyển dụng%"))), cancellationToken);

        var categoryCounts = new Dictionary<string, int>
        {
            ["music"] = musicCount,
            ["workshop"] = workshopCount,
            ["seminar"] = seminarCount,
            ["sports"] = sportsCount,
            ["career"] = careerCount
        };

        return new PublicEventPage(items, page, PageSize, count, totalPages, categoryCounts);
    }

    public Task<PublicEventDto?> GetDetailAsync(int id, DateTime now, CancellationToken cancellationToken) =>
        Project(PublicEvents(now).Where(e => e.Id == id), now).SingleOrDefaultAsync(cancellationToken);
}

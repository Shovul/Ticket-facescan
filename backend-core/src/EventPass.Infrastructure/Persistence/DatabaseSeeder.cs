using EventPass.Domain.Entities;
using EventPass.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Pgvector;

namespace EventPass.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public const string CustomerEmail = "customer@eventpass.local";
    public const string AdminEmail = "admin@eventpass.local";

    // Chỉ thêm dữ liệu còn thiếu, giữ nguyên dữ liệu đã sửa và các giao dịch đã phát sinh.
    public static async Task<SeedDatabaseResult> InitializeAsync(AppDbContext db,
        Func<User, string, string> hashPassword, CancellationToken ct = default)
    {
        if ((await db.Database.GetPendingMigrationsAsync(ct)).Any())
            throw new InvalidOperationException("Database chưa áp dụng đủ migration. Hãy chạy dotnet ef database update trước khi seed.");

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(709, 1)", ct);

        var usersAdded = 0;
        async Task<User> EnsureUser(string email, string name, string phone, UserRole role, string password)
        {
            var existing = await db.Users.IgnoreQueryFilters().SingleOrDefaultAsync(u => u.Email == email, ct);
            if (existing != null) return existing;
            var user = new User { Email = email, FullName = name, Phone = phone, Role = role };
            user.PasswordHash = hashPassword(user, password);
            db.Users.Add(user);
            usersAdded++;
            return user;
        }

        await EnsureUser(CustomerEmail, "Mai Phương", "0901234567", UserRole.User, "Customer@123");
        var admin = await EnsureUser(AdminEmail, "Ban tổ chức EventPass", "0909876543", UserRole.Admin, "Admin@123");
        await db.SaveChangesAsync(ct);

        var now = DateTime.UtcNow;
        var kioskSeed = await EnsureKioskDataAsync(db, admin, now, ct);
        usersAdded += kioskSeed.UsersAdded;
        var eventsAdded = kioskSeed.EventsAdded;
        foreach (var definition in Definitions())
        {
            if (await db.Events.IgnoreQueryFilters().AnyAsync(e => e.OrganizerId == admin.Id && e.Title == definition.Title, ct))
                continue;

            var start = now.Date.AddDays(definition.DaysFromToday).AddHours(definition.StartHourUtc);
            var cover = $"https://images.unsplash.com/{definition.Photo}?auto=format&fit=crop&w=1200&q=80";
            var ev = new Event
            {
                OrganizerId = admin.Id,
                Title = definition.Title,
                Description = definition.Description + "\n\nMỗi đơn tối đa 6 vé. Vé miễn phí giữ chỗ 5 phút; vé có phí thanh toán trong 10 phút. Đơn kết hợp có tổng 15 phút để hoàn tất Face ID vé miễn phí. Vé đã phát hành không hoàn/hủy vì lý do cá nhân.",
                Location = definition.Location,
                CoverImage = cover,
                EventImages = [cover],
                StartTime = start,
                EndTime = start.AddHours(definition.DurationHours),
                PublicTime = definition.Ended ? start.AddDays(-30) : now.AddDays(-3),
                OpenTicketTime = definition.Ended ? start.AddDays(-20) : definition.SalesLater ? now.AddDays(7) : now.AddDays(-2),
                CloseTicketTime = start.AddHours(-1),
                Status = definition.Ended ? EventStatus.Ended : EventStatus.Upcoming,
                IsFaceRecognitionEnabled = true,
                IsQrEnabled = true,
                Tickets = definition.Tickets.Select(t => new Ticket
                {
                    Name = t.Name, Price = t.Price, Quantity = t.Quantity, QuantitySold = 0, IsActive = t.IsActive
                }).ToList()
            };
            db.Events.Add(ev);
            eventsAdded++;
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new SeedDatabaseResult(usersAdded, eventsAdded);
    }

    // Giữ dữ liệu thử kiosk tương đương SQL cũ; không đặt lại vé đã điểm danh hoặc sửa sự kiện có sẵn.
    private static async Task<SeedDatabaseResult> EnsureKioskDataAsync(AppDbContext db, User admin, DateTime now, CancellationToken ct)
    {
        var usersAdded = 0;
        var eventsAdded = 0;
        var ev = await db.Events.IgnoreQueryFilters().SingleOrDefaultAsync(e => e.Id == 1, ct);
        if (ev == null)
        {
            ev = new Event
            {
                Id = 1,
                OrganizerId = admin.Id,
                Title = "Hội thảo Khoa học & Công nghệ SGU 2026",
                Description = "Sự kiện mẫu để thử nhận diện khuôn mặt và điểm danh kiosk.",
                CoverImage = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200",
                Location = "Hội trường A - Đại học Sài Gòn, 273 An Dương Vương, Q.5, TP.HCM",
                StartTime = now.AddHours(-1), EndTime = now.AddHours(8),
                Status = EventStatus.Ongoing, IsFaceRecognitionEnabled = true, IsQrEnabled = true
            };
            db.Events.Add(ev);
            await db.SaveChangesAsync(ct);
            await db.Database.ExecuteSqlRawAsync("SELECT setval(pg_get_serial_sequence('events', 'id'), GREATEST((SELECT MAX(id) FROM events), (SELECT last_value FROM events_id_seq)))", ct);
            eventsAdded++;
        }
        if (ev.IsDeleted) return new(usersAdded, eventsAdded);

        const string token = "SGU-KIOSK-LOCAL-2026";
        if (!await db.Kiosks.IgnoreQueryFilters().AnyAsync(k => k.SecretToken == token, ct))
            db.Kiosks.Add(new Kiosk { EventId = ev.Id, Name = "Kiosk Cổng 1", SecretToken = token });

        if (!await db.Tickets.IgnoreQueryFilters().AnyAsync(t => t.EventId == ev.Id && t.Name == "Vé Tiêu Chuẩn (Standard)", ct))
            db.Tickets.Add(new Ticket { EventId = ev.Id, Name = "Vé Tiêu Chuẩn (Standard)", Price = 100000m, Quantity = 200 });

        if (await db.TicketDetails.IgnoreQueryFilters().AnyAsync(t => t.TicketCode == "TK-SGU-VIP-8888", ct))
            return new(usersAdded, eventsAdded);

        using var stream = typeof(DatabaseSeeder).Assembly.GetManifestResourceStream("EventPass.KioskSeedVector.json")
            ?? throw new InvalidOperationException("Thiếu vector mẫu kiosk.");
        var vector = await JsonSerializer.DeserializeAsync<float[]>(stream, cancellationToken: ct);
        if (vector == null || vector.Length != 512 || vector.Any(v => !float.IsFinite(v)))
            throw new InvalidOperationException("Vector mẫu kiosk phải có 512 giá trị hợp lệ.");

        var guest = await db.Users.IgnoreQueryFilters().SingleOrDefaultAsync(u => u.Email == "guest@eventpass.vn", ct);
        if (guest == null)
        {
            guest = new User { Email = "guest@eventpass.vn", FullName = "Người Tham Dự Mẫu", Phone = "0912345678" };
            db.Users.Add(guest);
            usersAdded++;
        }
        var ticket = await db.Tickets.IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.EventId == ev.Id && t.Name == "Vé VIP - Khách Mời Danh Dự", ct);
        if (ticket == null)
        {
            ticket = new Ticket { EventId = ev.Id, Name = "Vé VIP - Khách Mời Danh Dự", Price = 250000m, Quantity = 50 };
            db.Tickets.Add(ticket);
        }
        if (ticket.IsDeleted || guest.IsDeleted) return new(usersAdded, eventsAdded);
        var order = await db.Orders.IgnoreQueryFilters().SingleOrDefaultAsync(o => o.OrderCode == "ORD-2026-SGU-001", ct);
        if (order == null)
        {
            order = new Order
            {
                User = guest, EventId = ev.Id, TotalAmount = 250000m, OrderCode = "ORD-2026-SGU-001",
                PaymentStatus = PaymentStatus.Success, PaymentMethod = "VietQR", TransactionCode = "TRANS-SGU-999988"
            };
            db.Orders.Add(order);
        }
        if (order.IsDeleted || order.EventId != ev.Id) return new(usersAdded, eventsAdded);
        db.TicketDetails.Add(new TicketDetail
        {
            Order = order, Ticket = ticket, EventId = ev.Id, TicketCode = "TK-SGU-VIP-8888",
            QrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TK-SGU-VIP-8888",
            AttendeeName = "Sinh Viên SGU (Chính Chủ)", AttendeeEmail = "sinhvien@sgu.edu.vn",
            AttendeePhone = "0988776655", FaceVector = new Vector(vector), Status = TicketDetailStatus.Valid
        });
        ticket.QuantitySold++;
        await db.SaveChangesAsync(ct);
        return new(usersAdded, eventsAdded);
    }

    // Lịch tương đối được tính lúc tạo lần đầu; khởi động lại không gia hạn hoặc đặt lại tồn kho.
    private static SeedEvent[] Definitions() =>
    [
        new("Ngày Hội Công Nghệ SGU TechDay", "Trải nghiệm sản phẩm công nghệ, gian hàng AI và các hoạt động giao lưu sinh viên. Hai hạng vé đều miễn phí.",
            "Hội trường A - Cơ sở chính Đại học Sài Gòn", "photo-1540575467063-178a50c2df87", 7, 1, 9.5,
            [("Vé Tiêu Chuẩn", 0m, 80, true), ("Vé Khách Mời VIP", 0m, 20, true)]),
        new("Hội Thảo AI & DeepFace Vision", "Gặp gỡ diễn giả, tìm hiểu thị giác máy tính và các ứng dụng nhận diện khuôn mặt. Hạng VIP có khu vực ghế ưu tiên.",
            "Phòng Hội thảo B302 - Đại học Sài Gòn", "photo-1591115765373-5207764f72e7", 10, 6, 4,
            [("Vé Hội Thảo", 250000m, 120, true), ("Vé Hội Thảo VIP", 500000m, 30, true)]),
        new("SGU Tech & Music Festival", "Workshop công nghệ miễn phí vào ban ngày và chương trình âm nhạc có phí vào buổi tối. Có thể chọn nhiều hạng vé trong cùng đơn.",
            "Hội trường A & Sân vận động SGU", "photo-1470225620780-dba8ba36b745", 14, 1, 14,
            [("Workshop Công Nghệ", 0m, 60, true), ("Đêm Nhạc - Khán Đài B", 200000m, 100, true), ("Đêm Nhạc - VIP Khán Đài A", 500000m, 20, true)]),
        new("Tọa Đàm Hướng Nghiệp Kỹ Sư Phần Mềm", "Giao lưu cùng doanh nghiệp, tư vấn thực tập và chuẩn bị hồ sơ nghề nghiệp. Chương trình đăng ký miễn phí.",
            "Hội trường C - Đại học Sài Gòn", "photo-1515187029135-18ee286d815b", 18, 1, 3,
            [("Vé Tham Dự", 0m, 40, true), ("Vé Giao Lưu Doanh Nghiệp", 0m, 10, true)]),
        new("Đêm Nhạc Acoustic Mùa Thu", "Thưởng thức các tiết mục acoustic trong không gian hội trường. Hai khu vực ghế có mức giá khác nhau.",
            "Hội trường B - Đại học Sài Gòn", "photo-1511671782779-c97d3d27a1d4", 21, 11, 4,
            [("Vé Khán Giả", 150000m, 50, true), ("Vé Hàng Ghế Đầu", 250000m, 20, true)]),
        new("Ngày Hội E-Sports & Chung Kết Sinh Viên", "Khu trải nghiệm mở cửa miễn phí; khu vực theo dõi chung kết có vé riêng. Có thể thử luồng chỉ miễn phí, chỉ có phí hoặc kết hợp.",
            "Nhà thi đấu - Cơ sở chính SGU", "photo-1504384308090-c894fdcc538d", 25, 2, 10,
            [("Khu Trải Nghiệm", 0m, 100, true), ("Vé Chung Kết", 100000m, 80, true)]),
        new("Workshop Nhiếp Ảnh - Nhóm Trải Nghiệm Nhỏ", "Buổi thực hành miễn phí giới hạn đúng 3 người để giảng viên hướng dẫn từng học viên. Phù hợp kiểm tra chọn vé sát số lượng còn lại.",
            "Studio thực hành - Phòng A204", "photo-1475721027785-f74eccf877e2", 30, 2, 3,
            [("Suất Thực Hành", 0m, 3, true)]),
        new("Giải Chạy Sinh Viên Vì Cộng Đồng", "Hoạt động chạy bộ và giao lưu tại sân vận động. Người tham dự chọn cự ly phù hợp khi đặt vé.",
            "Sân vận động - Đại học Sài Gòn", "photo-1517649763962-0c623066013b", 35, 0, 5,
            [("Cự Ly 3 KM", 100000m, 200, true), ("Cự Ly 5 KM", 150000m, 50, true)]),
        new("Triển Lãm Khởi Nghiệp - Đợt Mở Bán Sắp Tới", "Sự kiện đã công khai thông tin nhưng chưa đến ngày mở đăng ký. Khu triển lãm miễn phí và workshop chuyên đề có phí; hạng vé cũ đã ngừng hoạt động.",
            "Sảnh Nhà C - Đại học Sài Gòn", "photo-1475721027785-f74eccf877e2", 42, 2, 7,
            [("Vé Triển Lãm", 0m, 150, true), ("Workshop Khởi Nghiệp", 75000m, 25, true), ("Hạng Vé Cũ - Ngừng Đăng Ký", 50000m, 20, false)], SalesLater: true),
        new("Workshop Thiết Kế UI/UX - Kỳ Đã Kết Thúc", "Buổi hướng dẫn thiết kế giao diện đã kết thúc. Dữ liệu được giữ để kiểm tra sự kiện quá hạn không xuất hiện trong danh sách đang mở đăng ký.",
            "Phòng Lab A205 - Đại học Sài Gòn", "photo-1515187029135-18ee286d815b", -10, 1, 4,
            [("Vé Tham Dự UI/UX", 0m, 30, true)], Ended: true)
    ];

    private sealed record SeedEvent(string Title, string Description, string Location, string Photo,
        int DaysFromToday, int StartHourUtc, double DurationHours,
        (string Name, decimal Price, int Quantity, bool IsActive)[] Tickets, bool SalesLater = false, bool Ended = false);
}

public record SeedDatabaseResult(int UsersAdded, int EventsAdded);

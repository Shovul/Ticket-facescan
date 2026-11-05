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
        var kioskSeed = await EnsureKioskDataAsync(db, admin, hashPassword, now, ct);
        usersAdded += kioskSeed.UsersAdded;
        var eventsAdded = kioskSeed.EventsAdded;

        var sampleSeed = await EnsureComprehensiveSampleDataAsync(db, admin, hashPassword, now, ct);
        usersAdded += sampleSeed.UsersAdded;
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
                }).ToList(),
                Kiosks = new List<Kiosk> 
                { 
                    new Kiosk 
                    { 
                        Name = "Kiosk Cổng Chính (Face ID)", 
                        SecretToken = $"stk_live_{Guid.NewGuid():N}"[..12], 
                        IsActive = true 
                    } 
                }
            };
            db.Events.Add(ev);
            eventsAdded++;
        }

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return new SeedDatabaseResult(usersAdded, eventsAdded);
    }

    // Giữ dữ liệu thử kiosk tương đương SQL cũ; không đặt lại vé đã điểm danh hoặc sửa sự kiện có sẵn.
    private static async Task<SeedDatabaseResult> EnsureKioskDataAsync(AppDbContext db, User admin, Func<User, string, string> hashPassword, DateTime now, CancellationToken ct)
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
            guest = new User 
            { 
                Email = "guest@eventpass.vn", 
                FullName = "Người Tham Dự Mẫu", 
                Phone = "0912345678",
                Role = UserRole.User 
            };
            guest.PasswordHash = hashPassword(guest, "Guest@123");
            db.Users.Add(guest);
            usersAdded++;
            // guest = new User { Email = "guest@eventpass.vn", FullName = "Người Tham Dự Mẫu", Phone = "0912345678" };
            // db.Users.Add(guest);
            // usersAdded++;
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

    // Tự động nạp dữ liệu mẫu toàn diện cho tất cả các bảng (users, orders, order_items, ticket_details, checkin_logs)
    private static async Task<SeedDatabaseResult> EnsureComprehensiveSampleDataAsync(
        AppDbContext db, User admin, Func<User, string, string> hashPassword, DateTime now, CancellationToken ct)
    {
        var usersAdded = 0;

        // 1. Nạp danh sách 15 người dùng thực tế đại diện cho các vai trò
        var sampleUsers = new (string Email, string Name, string Phone, UserRole Role)[]
        {
            ("lethihong@gmail.com", "Lê Thị Hồng", "0912345601", UserRole.User),
            ("tranquocbao@gmail.com", "Trần Quốc Bảo", "0912345602", UserRole.User),
            ("nguyenthanhnam@gmail.com", "Nguyễn Thành Nam", "0912345603", UserRole.User),
            ("phamthithuy@gmail.com", "Phạm Thị Thúy", "0912345604", UserRole.User),
            ("hoangminhtuan@gmail.com", "Hoàng Minh Tuấn", "0912345605", UserRole.User),
            ("dangngoclan@gmail.com", "Đặng Ngọc Lan", "0912345606", UserRole.User),
            ("vuhoanglong@gmail.com", "Vũ Hoàng Long", "0912345607", UserRole.User),
            ("buiducthang@gmail.com", "Bùi Đức Thắng", "0912345608", UserRole.User),
            ("ngophuonganh@gmail.com", "Ngô Phương Anh", "0912345609", UserRole.User),
            ("dothikieu@gmail.com", "Đỗ Thị Kiều", "0912345610", UserRole.User),
            ("tochucsukien@sgu.edu.vn", "Ban Tổ Chức Hội Thảo SGU", "0908889901", UserRole.Admin),
            ("it.admin@eventpass.vn", "Quản Trị Viên Kỹ Thuật", "0908889902", UserRole.Admin)
        };

        var userEntities = new List<User>();
        foreach (var u in sampleUsers)
        {
            var existing = await db.Users.IgnoreQueryFilters().SingleOrDefaultAsync(x => x.Email == u.Email, ct);
            if (existing == null)
            {
                existing = new User
                {
                    Email = u.Email,
                    Username = u.Email.Split('@')[0] + "_" + Guid.NewGuid().ToString("N")[..6],
                    FullName = u.Name,
                    Phone = u.Phone,
                    Role = u.Role,
                    AvatarUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                };
                existing.PasswordHash = hashPassword(existing, "EventPass@2026");
                db.Users.Add(existing);
                usersAdded++;
            }
            userEntities.Add(existing);
        }
        await db.SaveChangesAsync(ct);

        // 2. Lấy sự kiện và vé mẫu đang có để nạp đơn hàng, vé và checkin log
        var ev = await db.Events.IgnoreQueryFilters().FirstOrDefaultAsync(e => e.Id == 1, ct)
                 ?? await db.Events.IgnoreQueryFilters().FirstOrDefaultAsync(ct);
        if (ev == null) return new(usersAdded, 0);

        var tickets = await db.Tickets.IgnoreQueryFilters().Where(t => t.EventId == ev.Id).ToListAsync(ct);
        if (!tickets.Any()) return new(usersAdded, 0);

        // Lấy vector mẫu 512 chiều từ Resource
        using var stream = typeof(DatabaseSeeder).Assembly.GetManifestResourceStream("EventPass.KioskSeedVector.json");
        float[] baseVector = stream != null
            ? (await JsonSerializer.DeserializeAsync<float[]>(stream, cancellationToken: ct)) ?? new float[512]
            : new float[512];
        if (baseVector.Length != 512) baseVector = new float[512];

        // 3. Nạp 15 đơn hàng (orders), 15 mục chi tiết đơn (order_items) và 15 vé chi tiết (ticket_details)
        var sampleAttendees = new (string Name, string Email, string Phone)[]
        {
            ("Lê Thị Hồng", "lethihong@gmail.com", "0912345601"),
            ("Trần Quốc Bảo", "tranquocbao@gmail.com", "0912345602"),
            ("Nguyễn Thành Nam", "nguyenthanhnam@gmail.com", "0912345603"),
            ("Phạm Thị Thúy", "phamthithuy@gmail.com", "0912345604"),
            ("Hoàng Minh Tuấn", "hoangminhtuan@gmail.com", "0912345605"),
            ("Đặng Ngọc Lan", "dangngoclan@gmail.com", "0912345606"),
            ("Vũ Hoàng Long", "vuhoanglong@gmail.com", "0912345607"),
            ("Bùi Đức Thắng", "buiducthang@gmail.com", "0912345608"),
            ("Ngô Phương Anh", "ngophuonganh@gmail.com", "0912345609"),
            ("Đỗ Thị Kiều", "dothikieu@gmail.com", "0912345610"),
            ("Nguyễn Văn An", "nguyenvanan@sgu.edu.vn", "0912345611"),
            ("Trần Mai Linh", "tranmailinh@sgu.edu.vn", "0912345612"),
            ("Lê Tuấn Kiệt", "letuankiet@sgu.edu.vn", "0912345613"),
            ("Phan Thị Hạnh", "phanthihanh@sgu.edu.vn", "0912345614"),
            ("Võ Minh Triết", "vominhtriet@sgu.edu.vn", "0912345615")
        };

        var ticketDetailEntities = new List<TicketDetail>();

        for (int i = 0; i < sampleAttendees.Length; i++)
        {
            var att = sampleAttendees[i];
            var code = $"TK-SGU-2026-{(i + 1):D4}";
            var orderCode = $"ORD-2026-SGU-{(i + 2):D3}";

            var ticket = tickets[i % tickets.Count];
            var buyer = userEntities[i % userEntities.Count];

            var order = await db.Orders.IgnoreQueryFilters().SingleOrDefaultAsync(o => o.OrderCode == orderCode, ct);
            if (order == null)
            {
                order = new Order
                {
                    UserId = buyer.Id,
                    EventId = ev.Id,
                    OrderCode = orderCode,
                    TotalAmount = ticket.Price > 0 ? ticket.Price : 0,
                    PaymentMethod = ticket.Price > 0 ? "VietQR" : "FreePass",
                    PaymentStatus = PaymentStatus.Success,
                    TransactionCode = $"TRANS-SGU-{(100000 + i)}",
                    PaidAt = now.AddHours(-2 - i)
                };
                db.Orders.Add(order);
                await db.SaveChangesAsync(ct);

                // Nạp order_items
                var orderItem = new OrderItem
                {
                    OrderId = order.Id,
                    TicketId = ticket.Id,
                    UnitPrice = ticket.Price,
                    Status = "confirmed",
                    AttendeeName = att.Name,
                    AttendeeEmail = att.Email,
                    AttendeePhone = att.Phone,
                    FaceConsentAt = now.AddHours(-2 - i)
                };
                db.OrderItems.Add(orderItem);
            }

            var ticketDetail = await db.TicketDetails.IgnoreQueryFilters().SingleOrDefaultAsync(t => t.TicketCode == code, ct);
            if (ticketDetail == null)
            {
                // Biến thiên nhẹ vector mẫu cho từng người tham dự để mô phỏng nhận diện sinh trắc học
                var personVector = (float[])baseVector.Clone();
                if (personVector.Length == 512)
                {
                    personVector[i % 512] += (float)(0.01 * (i + 1));
                }

                ticketDetail = new TicketDetail
                {
                    OrderId = order.Id,
                    EventId = ev.Id,
                    TicketId = ticket.Id,
                    TicketCode = code,
                    QrCodeUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={code}",
                    AttendeeName = att.Name,
                    AttendeeEmail = att.Email,
                    AttendeePhone = att.Phone,
                    FaceVector = new Vector(personVector),
                    Status = (i < 8) ? TicketDetailStatus.CheckedIn : TicketDetailStatus.Valid,
                    CheckedInAt = (i < 8) ? now.AddMinutes(-10 * (i + 1)) : null
                };
                db.TicketDetails.Add(ticketDetail);
                ticket.QuantitySold++;
            }
            ticketDetailEntities.Add(ticketDetail);
        }
        await db.SaveChangesAsync(ct);

        // 4. Nạp 20 bản ghi checkin_logs (Nhật ký điểm danh Kiosk thời gian thực)
        if (!await db.CheckinLogs.IgnoreQueryFilters().AnyAsync(ct))
        {
            var logs = new List<CheckinLog>();
            var kiosksList = new[] { "Kiosk Cổng 1 (Chính)", "Kiosk Cổng 2 (VIP)", "Kiosk Cổng 3 (Hội trường)" };

            for (int i = 0; i < 20; i++)
            {
                var td = ticketDetailEntities[i % ticketDetailEntities.Count];
                var isSuccess = (i % 6 != 0); // Đa phần hợp lệ, thi thoảng có cảnh báo

                logs.Add(new CheckinLog
                {
                    TicketDetailId = td.Id > 0 ? td.Id : null,
                    EventId = ev.Id,
                    KioskName = kiosksList[i % kiosksList.Length],
                    CapturedAt = now.AddMinutes(-5 * (20 - i)),
                    MatchDistance = isSuccess ? 0.18 + (i * 0.005) : 0.42,
                    FaceConfidence = isSuccess ? 0.94 - (i * 0.008) : 0.58,
                    Status = isSuccess ? "VALID" : "DUPLICATE",
                    Notes = isSuccess
                        ? $"Xác thực khuôn mặt thành công (< 0.45s) - Đối soát vé {td.TicketCode}"
                        : $"Cảnh báo: Phát hiện khuôn mặt đã từng check-in lúc {now.AddMinutes(-30):HH:mm}"
                });
            }
            db.CheckinLogs.AddRange(logs);
            await db.SaveChangesAsync(ct);
        }

        return new SeedDatabaseResult(usersAdded, 0);
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

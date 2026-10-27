using System.Security.Cryptography;
using System.Text;
using EventPass.Application.DTOs.Bookings;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;
using Pgvector;

namespace EventPass.Application.Services;

public class BookingService(IBookingRepository repository, IAiServiceClient ai,
    IBookingPaymentDetails paymentDetails, IBookingFaceImageProtector imageProtector,
    IBookingEmailSender emailSender) : IBookingService, IBookingPaymentReceiver
{
    // Lấy tên, ảnh đại diện và số vé còn hiệu lực cho thanh điều hướng khách hàng.
    public async Task<CustomerSummaryDto> GetCustomerAsync(int userId, CancellationToken ct)
    {
        var user = await repository.GetUserAsync(userId, ct);
        if (user == null || (int)user.Role is not (0 or 1))
            throw new BookingException(403, "Tài khoản khách hàng không còn khả dụng.");
        return new CustomerSummaryDto(user.Id, user.FullName, user.AvatarUrl,
            await repository.CountCustomerTicketsAsync(userId, DateTime.UtcNow, ct));
    }

    public async Task<BookingDto> ReserveAsync(int userId, ReserveTicketsRequest request, CancellationToken ct)
    {
        if (request.Items.Count == 0 || request.Items.Any(i => i.Quantity < 1 || i.Quantity > 6)
            || request.Items.Sum(i => i.Quantity) > 6 || request.Items.Select(i => i.TicketTypeId).Distinct().Count() != request.Items.Count)
            throw new BookingException(400, "Mỗi đơn chỉ được đặt từ 1 đến 6 vé; không lặp hạng vé.");

        return await repository.InEventTransactionAsync(request.EventId, async () =>
        {
            var user = await repository.GetUserAsync(userId, ct);
            if (user == null || (int)user.Role is not (0 or 1))
                throw new BookingException(403, "Chỉ tài khoản khách hàng đang hoạt động được đặt vé.");
            var previous = await repository.GetRequestAsync(userId, request.RequestKey, ct);
            if (previous != null)
            {
                if (previous.EventId != request.EventId || request.Items.Any(i => previous.Items.Count(p => p.TicketId == i.TicketTypeId) != i.Quantity)
                    || previous.Items.Count != request.Items.Sum(i => i.Quantity))
                    throw new BookingException(409, "Yêu cầu đặt vé này đã được dùng cho lựa chọn khác.");
                Expire(previous, DateTime.UtcNow);
                return ToDto(previous);
            }

            var now = DateTime.UtcNow;
            var ev = await repository.GetEventAsync(request.EventId, ct);
            if (ev == null || (ev.Status != EventStatus.Upcoming && ev.Status != EventStatus.Ongoing)
                || ev.PublicTime == null || ev.OpenTicketTime == null || ev.CloseTicketTime == null
                || ev.PublicTime > now || ev.OpenTicketTime > now || ev.CloseTicketTime <= now || ev.EndTime <= now
                || ev.PublicTime >= ev.OpenTicketTime || ev.OpenTicketTime >= ev.CloseTicketTime
                || ev.CloseTicketTime > ev.StartTime || ev.EndTime <= ev.StartTime)
                throw new BookingException(409, "Sự kiện chưa mở bán hoặc đã đóng đăng ký.");

            var selected = new List<(Ticket Ticket, int Quantity)>();
            foreach (var line in request.Items.OrderBy(i => i.TicketTypeId))
            {
                var ticket = ev.Tickets.SingleOrDefault(t => t.Id == line.TicketTypeId);
                if (ticket == null || ticket.Price < 0)
                    throw new BookingException(400, "Hạng vé không hợp lệ hoặc không thuộc sự kiện.");
                var held = await repository.HeldQuantityAsync(ticket.Id, now, ct);
                if (ticket.Quantity - ticket.QuantitySold - held < line.Quantity)
                    throw new BookingException(409, $"Hạng vé {ticket.Name} không còn đủ số lượng. Vui lòng chọn lại.");
                selected.Add((ticket, line.Quantity));
            }

            var total = selected.Sum(i => i.Ticket.Price * i.Quantity);
            if (total > 0 && !paymentDetails.IsConfigured)
                throw new BookingException(503, "Thanh toán trực tuyến hiện chưa sẵn sàng. Vui lòng thử lại sau.");
            var mixed = total > 0 && selected.Any(i => i.Ticket.Price == 0);
            var order = new Order
            {
                UserId = userId, User = user, Event = ev, EventId = ev.Id,
                OrderCode = "ORD" + Guid.NewGuid().ToString("N").ToUpperInvariant(),
                RequestKey = request.RequestKey, TotalAmount = total, PaymentMethod = total == 0 ? "Free" : "VietQR",
                PaymentStatus = PaymentStatus.Pending, ReservationStatus = "holding",
                ExpiresAt = now.AddMinutes(total == 0 ? 5 : mixed ? 15 : 10),
                PaymentExpiresAt = total > 0 ? now.AddMinutes(10) : null
            };
            foreach (var line in selected)
                for (var i = 0; i < line.Quantity; i++)
                    order.Items.Add(new OrderItem { Ticket = line.Ticket, TicketId = line.Ticket.Id, UnitPrice = line.Ticket.Price });
            repository.AddOrder(order);
            await repository.SaveAsync(ct);
            return ToDto(order);
        }, ct);
    }

    public Task<BookingDto> GetAsync(int userId, string code, CancellationToken ct) =>
        WithOrder(userId, code, o => Task.FromResult(ToDto(o)), ct);

    public Task<BookingDto> UpdateAttendeeAsync(int userId, string code, int itemId, AttendeeRequest request, CancellationToken ct) =>
        WithOrder(userId, code, o =>
        {
            var item = EditableItem(o, itemId);
            if (item.Status == "issued" && item.FaceVector != null)
                throw new BookingException(409, "Chỉ được thay ảnh, không đổi người tham dự sau khi vé đã có Face ID.");
            item.AttendeeName = request.Name.Trim();
            item.AttendeeEmail = request.Email.Trim();
            item.AttendeePhone = request.Phone.Trim();
            if (item.TicketDetail != null)
            {
                item.TicketDetail.AttendeeName = item.AttendeeName;
                item.TicketDetail.AttendeeEmail = item.AttendeeEmail;
                item.TicketDetail.AttendeePhone = item.AttendeePhone;
            }
            return Task.FromResult(ToDto(o));
        }, ct);

    public async Task<BookingDto> UploadFaceAsync(int userId, string code, int itemId, AttendeeRequest attendee, byte[] image, string contentType, CancellationToken ct)
        => await SaveFaceAsync(userId, code, itemId, image, contentType, ct, attendee: attendee);

    private async Task<BookingDto> SaveFaceAsync(int userId, string code, int itemId, byte[] image, string contentType,
        CancellationToken ct, string? claimHash = null, AttendeeRequest? attendee = null)
    {
        await WithOrder(userId, code, o =>
        {
            var item = EditableItem(o, itemId);
            if (claimHash != null) ValidateClaim(o, item, claimHash);
            if (attendee != null)
            {
                ValidateAttendee(attendee);
                return Task.FromResult(true);
            }
            if (string.IsNullOrWhiteSpace(item.AttendeeName) || string.IsNullOrWhiteSpace(item.AttendeeEmail) || string.IsNullOrWhiteSpace(item.AttendeePhone))
                throw new BookingException(422, "Vui lòng lưu thông tin người tham dự trước khi nạp ảnh khuôn mặt.");
            return Task.FromResult(true);
        }, ct);
        using var stream = new MemoryStream(image);
        var result = await ai.ExtractFaceEmbeddingAsync(stream, "portrait", true, false, ct);
        if (!result.Success || result.Embedding is not { Count: 512 } || result.Embedding.Any(v => !float.IsFinite(v)) || result.Embedding.All(v => v == 0))
            throw new BookingException(result.ErrorCode == "AI_SERVICE_UNAVAILABLE" ? 503 : 422,
                result.ErrorMessage ?? "Ảnh phải rõ mặt, chính diện và chỉ có một người.");

        return await WithOrder(userId, code, async o =>
        {
            var item = EditableItem(o, itemId);
            if (claimHash != null) ValidateClaim(o, item, claimHash);
            if (attendee != null)
            {
                item.AttendeeName = attendee.Name.Trim();
                item.AttendeeEmail = attendee.Email.Trim();
                item.AttendeePhone = attendee.Phone.Trim();
            }
            var faces = await repository.OtherFacesAsync(o.EventId, itemId, DateTime.UtcNow, ct);
            if (faces.Any(v => CosineDistance(v, result.Embedding.ToArray()) <= 0.35))
                throw new BookingException(409, "Khuôn mặt này đã được đăng ký cho vé khác trong cùng sự kiện.");
            item.FaceVector = new Vector(result.Embedding.ToArray());
            item.ProtectedFaceImage = imageProtector.Protect(image);
            item.FaceImageContentType = contentType;
            item.FaceConsentAt = DateTime.UtcNow;
            item.ClaimTokenHash = null;
            if (item.TicketDetail != null)
            {
                item.TicketDetail.AttendeeName = item.AttendeeName!;
                item.TicketDetail.AttendeeEmail = item.AttendeeEmail!;
                item.TicketDetail.AttendeePhone = item.AttendeePhone;
                item.TicketDetail.FaceVector = item.FaceVector;
                item.TicketDetail.AttendeeFaceData = $"booking-item:{item.Id}";
            }
            if (claimHash != null && item.UnitPrice == 0 && item.Status == "reserved")
            {
                Issue(o, item);
                if (o.TotalAmount == 0) o.PaymentStatus = PaymentStatus.Success;
                if (o.Items.All(i => i.Status != "reserved")) o.ReservationStatus = "completed";
            }
            return ToDto(o);
        }, ct);
    }

    public async Task<BookingDto> ConfirmFreeAsync(int userId, string code, CancellationToken ct)
    {
        await WithOrder(userId, code, o =>
        {
            if (o.ReservationStatus is "expired" or "cancelled")
                throw new BookingException(409, "Đơn đã hết hạn hoặc bị hủy.");
            var free = o.Items.Where(i => i.UnitPrice == 0 && i.Status == "reserved").ToList();
            if (o.TotalAmount > 0 && o.PaidAt == null)
                throw new BookingException(409, "Cần hoàn tất thanh toán trước khi kích hoạt vé miễn phí đi kèm.");
            if (free.Any(i => !Ready(i)))
                throw new BookingException(422, "Vui lòng nhập đủ thông tin và Face ID cho tất cả vé miễn phí.");
            foreach (var item in free) Issue(o, item);
            if (o.TotalAmount == 0 && o.Items.Any(i => i.Status == "issued"))
                o.PaymentStatus = PaymentStatus.Success;
            if (o.Items.All(i => i.Status != "reserved"))
                o.ReservationStatus = "completed";
            return Task.FromResult(true);
        }, ct);
        await SendEmail(userId, code, ct);
        return await GetAsync(userId, code, ct);
    }

    public Task<BookingDto> CancelAsync(int userId, string code, CancellationToken ct) =>
        WithOrder(userId, code, o =>
        {
            if (o.Items.Any(i => i.Status == "issued"))
                throw new BookingException(409, "Vé đã phát hành không được hoàn hoặc hủy vì lý do cá nhân.");
            foreach (var item in o.Items.Where(i => i.Status == "reserved")) item.Status = "cancelled";
            o.ReservationStatus = o.ReservationStatus == "expired" ? "expired" : "cancelled";
            return Task.FromResult(ToDto(o));
        }, ct);

    // Chỉ dịch vụ webhook đã xác thực của nhóm gọi giao diện này, không cho FE tự xác nhận tiền.
    public async Task ConfirmPaymentAsync(PaymentConfirmation payment, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(payment.Reference) || payment.Reference.Length > 100 || payment.Amount <= 0)
            throw new BookingException(400, "Thông tin giao dịch không hợp lệ.");
        var eventId = await repository.GetOrderEventIdAsync(payment.OrderCode, ct);
        if (eventId == 0) throw new BookingException(404, "Không tìm thấy đơn cần đối soát.");
        var owner = await repository.InEventTransactionAsync(eventId, async () =>
        {
            var o = await repository.GetOrderAsync(payment.OrderCode, ct)
                ?? throw new BookingException(404, "Không tìm thấy đơn cần đối soát.");
            if (o.PaidAt != null)
            {
                if (o.PaymentReference != payment.Reference || o.TotalAmount != payment.Amount)
                    throw new BookingException(409, "Đơn đã được ghi nhận bằng giao dịch khác.");
                return o.UserId;
            }
            Expire(o, DateTime.UtcNow);
            if (o.ReservationStatus != "holding" || o.PaymentExpiresAt <= DateTime.UtcNow)
                throw new BookingException(409, "Đơn đã hết hạn. Chuyển giao dịch sang đối soát hoàn tiền.");
            if (o.TotalAmount != payment.Amount || await repository.PaymentReferenceExistsAsync(payment.Reference, o.Id, ct))
                throw new BookingException(409, "Số tiền không khớp hoặc giao dịch đã được dùng.");
            if (o.Event.Status == EventStatus.Cancelled || o.Event.EndTime <= DateTime.UtcNow)
                throw new BookingException(409, "Sự kiện không còn nhận thanh toán. Cần đối soát giao dịch.");
            o.PaidAt = DateTime.UtcNow;
            o.PaymentReference = payment.Reference;
            o.TransactionCode = payment.Reference;
            o.PaymentStatus = PaymentStatus.Success;
            foreach (var item in o.Items.Where(i => i.UnitPrice > 0 && i.Status == "reserved")) Issue(o, item);
            o.ReservationStatus = o.Items.Any(i => i.Status == "reserved") ? "awaiting_faces" : "completed";
            return o.UserId;
        }, ct);
        await SendEmail(owner, payment.OrderCode, ct);
    }

    public async Task ExpireAsync(CancellationToken ct)
    {
        await repository.DeleteExpiredPhotosAsync(DateTime.UtcNow, ct);
        foreach (var eventId in await repository.ExpiringEventsAsync(ct))
            await repository.InEventTransactionAsync(eventId, async () =>
            {
                foreach (var o in await repository.PendingOrdersAsync(eventId, ct)) Expire(o, DateTime.UtcNow);
                return true;
            }, ct);
    }


    // Trả hai khu vực đơn giữ chỗ và vé chính thức, phân trang bốn vé theo bộ lọc.
    public async Task<CustomerTicketsDto> GetTicketsAsync(int userId, int page, string filter, CancellationToken ct)
    {
        if (page < 1 || filter is not ("all" or "free" or "paid" or "pending"))
            throw new BookingException(400, "Bộ lọc hoặc số trang không hợp lệ.");
        await GetCustomerAsync(userId, ct);
        var orders = await repository.GetCustomerOrdersAsync(userId, ct);
        foreach (var order in orders.Where(o => o.ReservationStatus is "holding" or "awaiting_faces"))
            await GetAsync(userId, order.OrderCode, ct);
        orders = await repository.GetCustomerOrdersAsync(userId, ct);
        var tickets = orders.SelectMany(o => o.Items.Where(i => i.Status == "issued" && i.TicketDetail != null)
            .Select(i => TicketDto(o, i))).ToList();
        var filtered = tickets.Where(t => filter switch
        {
            "free" => t.Price == 0, "paid" => t.Price > 0,
            "pending" => !t.HasFaceId && t.Status == "valid", _ => true
        }).ToList();
        var pages = Math.Max(1, (filtered.Count + 3) / 4);
        page = Math.Min(page, pages);
        return new(orders.Where(o => o.Items.Any(i => i.Status == "reserved")).Select(ToDto).ToList(),
            filtered.Skip((page - 1) * 4).Take(4).ToList(), page, pages, filtered.Count, tickets.Count,
            tickets.Count(t => t.Price == 0), tickets.Count(t => t.Price > 0),
            tickets.Count(t => !t.HasFaceId && t.Status == "valid"), DateTime.UtcNow);
    }

    public Task<DigitalPassDto> GetPassAsync(int userId, string code, int itemId, CancellationToken ct) =>
        WithOrder(userId, code, o =>
        {
            var item = o.Items.SingleOrDefault(i => i.Id == itemId && i.Status == "issued" && i.TicketDetail != null)
                ?? throw new BookingException(404, "Không tìm thấy thẻ vé.");
            var image = item.ProtectedFaceImage == null ? null
                : "data:" + item.FaceImageContentType + ";base64," + Convert.ToBase64String(imageProtector.Unprotect(item.ProtectedFaceImage));
            return Task.FromResult(new DigitalPassDto(TicketDto(o, item), image));
        }, ct);

    // Chỉ hủy các suất chưa phát hành; vé đã mua luôn được bảo lưu.
    public Task<BookingDto> CancelPartAsync(int userId, string code, string part, CancellationToken ct) =>
        WithOrder(userId, code, o =>
        {
            if (part is not ("free" or "paid")) throw new BookingException(400, "Phần đơn không hợp lệ.");
            if (part == "paid" && (o.PaidAt != null || o.Items.Any(i => i.UnitPrice > 0 && i.Status == "issued")))
                throw new BookingException(409, "Vé đã thanh toán không được hoàn hoặc hủy vì lý do cá nhân.");
            var pending = o.Items.Where(i => i.Status == "reserved" && (part == "free" ? i.UnitPrice == 0 : i.UnitPrice > 0)).ToList();
            if (pending.Count == 0) throw new BookingException(409, "Không còn suất giữ chỗ có thể hủy.");
            foreach (var item in pending) { item.Status = "cancelled"; item.ClaimTokenHash = null; }
            if (o.PaidAt == null)
            {
                o.TotalAmount = o.Items.Where(i => i.Status == "reserved").Sum(i => i.UnitPrice);
                if (o.TotalAmount == 0)
                {
                    o.PaymentExpiresAt = null;
                    o.PaymentMethod = "Free";
                    var freeDeadline = o.CreatedAt.AddMinutes(5);
                    if (o.ExpiresAt > freeDeadline) o.ExpiresAt = freeDeadline;
                }
                else if (!o.Items.Any(i => i.Status == "reserved" && i.UnitPrice == 0)) o.ExpiresAt = o.PaymentExpiresAt;
            }
            o.ReservationStatus = o.Items.Any(i => i.Status == "reserved") ? o.PaidAt == null ? "holding" : "awaiting_faces"
                : o.Items.Any(i => i.Status == "issued") ? "completed" : "cancelled";
            Expire(o, DateTime.UtcNow);
            return Task.FromResult(ToDto(o));
        }, ct);

    public Task<ClaimLinkDto> CreateClaimAsync(int userId, string code, int itemId, CancellationToken ct) =>
        WithOrder(userId, code, o =>
        {
            var item = EditableItem(o, itemId);
            if (item.FaceVector != null) throw new BookingException(409, "Vé đã có Face ID; không thể chuyển người nhận.");
            if (item.UnitPrice > 0 && o.PaidAt == null) throw new BookingException(409, "Cần thanh toán trước khi gửi liên kết nhận vé.");
            var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
            item.ClaimTokenHash = HashToken(token);
            return Task.FromResult(new ClaimLinkDto(token, ClaimDeadline(o, item)));
        }, ct);

    public async Task<ClaimTicketDto> GetClaimAsync(string token, CancellationToken ct)
    {
        var hash = HashToken(token);
        var order = await repository.GetClaimOrderAsync(hash, ct) ?? throw new BookingException(404, "Liên kết nhận vé không còn hiệu lực.");
        return await WithOrder(order.UserId, order.OrderCode, o =>
        {
            var item = o.Items.SingleOrDefault(i => i.ClaimTokenHash == hash) ?? throw new BookingException(404, "Liên kết đã được thay mới.");
            ValidateClaim(o, item, hash);
            return Task.FromResult(new ClaimTicketDto(o.Event.Title, item.Ticket.Name, ClaimDeadline(o, item), DateTime.UtcNow));
        }, ct);
    }

    public async Task<ClaimTicketDto> CompleteClaimAsync(string token, AttendeeRequest attendee, byte[] image, string contentType, CancellationToken ct)
    {
        var hash = HashToken(token);
        var order = await repository.GetClaimOrderAsync(hash, ct) ?? throw new BookingException(404, "Liên kết nhận vé không còn hiệu lực.");
        var item = order.Items.Single(i => i.ClaimTokenHash == hash);
        var result = await SaveFaceAsync(order.UserId, order.OrderCode, item.Id, image, contentType, ct, hash, attendee);
        await SendEmail(order.UserId, order.OrderCode, ct);
        return new(result.EventTitle, item.Ticket.Name, ClaimDeadline(order, item), DateTime.UtcNow);
    }

    private static string HashToken(string token)
    {
        if (token.Length != 64 || token.Any(c => !Uri.IsHexDigit(c))) throw new BookingException(404, "Liên kết nhận vé không hợp lệ.");
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    private static void ValidateAttendee(AttendeeRequest attendee)
    {
        var name = attendee.Name.Trim();
        var email = attendee.Email.Trim();
        var phone = attendee.Phone.Trim();
        if (name.Length is < 2 or > 100 || email.Length is 0 or > 255 || !email.Contains('@') || phone.Length != 10 || !phone.All(char.IsDigit))
            throw new BookingException(422, "Thông tin người tham dự không hợp lệ.");
    }

    private static DateTime ClaimDeadline(Order order, OrderItem item) => item.UnitPrice == 0
        ? order.ExpiresAt ?? order.Event.StartTime : order.Event.StartTime;

    private static void ValidateClaim(Order order, OrderItem item, string hash)
    {
        EditableItem(order, item.Id);
        if (item.ClaimTokenHash != hash || item.FaceVector != null || ClaimDeadline(order, item) <= DateTime.UtcNow
            || (order.TotalAmount > 0 && order.PaidAt == null))
            throw new BookingException(410, "Liên kết đã hết hạn, được thay mới hoặc vé đã nhận.");
    }

    private static CustomerTicketDto TicketDto(Order order, OrderItem item)
    {
        var ticket = item.TicketDetail!;
        var status = order.Event.Status == EventStatus.Cancelled ? "cancelled"
            : ticket.Status == TicketDetailStatus.CheckedIn ? "checkedin"
            : ticket.Status == TicketDetailStatus.Cancelled ? "cancelled"
            : ticket.Status == TicketDetailStatus.Expired || order.Event.EndTime <= DateTime.UtcNow ? "expired" : "valid";
        return new(order.OrderCode, item.Id, order.Event.Title, order.Event.Location, order.Event.StartTime, order.Event.EndTime,
            string.Join(" • ", order.Event.Kiosks.Where(k => k.IsActive).Select(k => k.Name)), item.Ticket.Name, item.UnitPrice,
            ticket.TicketCode, ticket.QrCodeUrl, item.AttendeeName, item.FaceVector != null, status, ticket.CheckedInAt);
    }

    private async Task<T> WithOrder<T>(int userId, string code, Func<Order, Task<T>> action, CancellationToken ct)
    {
        var eventId = await repository.GetOrderEventIdAsync(code, ct);
        if (eventId == 0) throw new BookingException(404, "Không tìm thấy đơn đặt vé.");
        return await repository.InEventTransactionAsync(eventId, async () =>
        {
            var o = await repository.GetOrderAsync(code, ct)
                ?? throw new BookingException(404, "Không tìm thấy đơn đặt vé.");
            if (o.UserId != userId || o.ReservationStatus == null || (int)o.User.Role is not (0 or 1))
                throw new BookingException(404, "Không tìm thấy đơn đặt vé.");
            Expire(o, DateTime.UtcNow);
            return await action(o);
        }, ct);
    }

    private static void Expire(Order o, DateTime now)
    {
        if (o.ReservationStatus is not ("holding" or "awaiting_faces")) return;
        var expired = o.Event.Status == EventStatus.Cancelled || o.Event.EndTime <= now
            || o.ExpiresAt <= now || (o.PaidAt == null && o.PaymentExpiresAt <= now);
        if (!expired) return;
        foreach (var item in o.Items.Where(i => i.Status == "reserved")) item.Status = "expired";
        o.ReservationStatus = o.Items.Any(i => i.Status == "issued") ? "completed" : "expired";
    }

    private static OrderItem EditableItem(Order o, int id)
    {
        var item = o.Items.SingleOrDefault(i => i.Id == id);
        if (item == null) throw new BookingException(404, "Không tìm thấy vé trong đơn.");
        if (item.Status is "expired" or "cancelled" || o.Event.Status == EventStatus.Cancelled || o.Event.StartTime <= DateTime.UtcNow)
            throw new BookingException(409, "Vé không còn được cập nhật thông tin.");
        if (item.TicketDetail != null && item.TicketDetail.Status != TicketDetailStatus.Valid)
            throw new BookingException(409, "Thông tin nhận diện vé đã được chốt. Vui lòng liên hệ hỗ trợ.");
        return item;
    }

    private static bool Ready(OrderItem item) => !string.IsNullOrWhiteSpace(item.AttendeeName)
        && !string.IsNullOrWhiteSpace(item.AttendeeEmail) && !string.IsNullOrWhiteSpace(item.AttendeePhone) && item.FaceVector != null;

    private void Issue(Order o, OrderItem item)
    {
        var ticket = new TicketDetail
        {
            Order = o, Event = o.Event, EventId = o.EventId, Ticket = item.Ticket, TicketId = item.TicketId,
            TicketCode = "PASS" + Guid.NewGuid().ToString("N").ToUpperInvariant(),
            AttendeeName = item.AttendeeName ?? o.User.FullName, AttendeeEmail = item.AttendeeEmail ?? o.User.Email,
            AttendeePhone = item.AttendeePhone, FaceVector = item.FaceVector, Status = TicketDetailStatus.Valid,
            AttendeeFaceData = item.FaceVector != null ? $"booking-item:{item.Id}" : null
        };
        ticket.QrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + Uri.EscapeDataString(ticket.TicketCode);
        repository.AddTicket(ticket);
        o.ConfirmationEmailSentAt = null;
        item.TicketDetail = ticket;
        item.Status = "issued";
        item.ClaimTokenHash = null;
        item.Ticket.QuantitySold++;
    }

    private BookingDto ToDto(Order o) => new(o.Id, o.OrderCode, o.EventId, o.Event.Title, o.Event.Location,
        o.Event.StartTime, o.ReservationStatus ?? "unknown", o.TotalAmount, DateTime.UtcNow, o.ExpiresAt,
        o.PaymentExpiresAt, o.PaidAt, o.Items.OrderBy(i => i.Id).Select(i => new BookingItemDto(i.Id, i.TicketId,
            i.Ticket.Name, i.UnitPrice, i.Status, i.AttendeeName, i.AttendeeEmail, i.AttendeePhone,
            i.FaceVector != null, i.TicketDetail?.TicketCode, i.TicketDetail?.QrCodeUrl, i.ClaimTokenHash != null)).ToList(),
        o.TotalAmount > 0 && o.PaidAt == null && o.ReservationStatus == "holding" && paymentDetails.IsConfigured
            ? paymentDetails.Create(o.OrderCode, o.TotalAmount) : null, o.ConfirmationEmailSentAt != null);

    private async Task SendEmail(int userId, string code, CancellationToken ct)
    {
        var dto = await GetAsync(userId, code, ct);
        if (dto.EmailSent || !dto.Items.Any(i => i.Status == "issued")) return;
        var user = await repository.GetUserAsync(userId, ct);
        if (user == null) return;
        if (await emailSender.SendAsync(new BookingEmail(user.Email, dto.OrderCode, dto.EventTitle, dto.Location,
                dto.StartTime, dto.Items.Where(i => i.Status == "issued").ToList()), ct))
            await WithOrder(userId, code, o => { o.ConfirmationEmailSentAt = DateTime.UtcNow; return Task.FromResult(true); }, ct);
    }

    private static double CosineDistance(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 1;
        double dot = 0, aa = 0, bb = 0;
        for (var i = 0; i < a.Length; i++) { dot += (double)a[i] * b[i]; aa += (double)a[i] * a[i]; bb += (double)b[i] * b[i]; }
        return aa == 0 || bb == 0 ? 1 : 1 - dot / Math.Sqrt(aa * bb);
    }
}

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

    public async Task<BookingDto> UploadFaceAsync(int userId, string code, int itemId, byte[] image, string contentType, CancellationToken ct)
    {
        await WithOrder(userId, code, o =>
        {
            var item = EditableItem(o, itemId);
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
            var faces = await repository.OtherFacesAsync(o.EventId, itemId, DateTime.UtcNow, ct);
            if (faces.Any(v => CosineDistance(v, result.Embedding.ToArray()) <= 0.35))
                throw new BookingException(409, "Khuôn mặt này đã được đăng ký cho vé khác trong cùng sự kiện.");
            item.FaceVector = new Vector(result.Embedding.ToArray());
            item.ProtectedFaceImage = imageProtector.Protect(image);
            item.FaceImageContentType = contentType;
            item.FaceConsentAt = DateTime.UtcNow;
            if (item.TicketDetail != null)
            {
                item.TicketDetail.FaceVector = item.FaceVector;
                item.TicketDetail.AttendeeFaceData = $"booking-item:{item.Id}";
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
        if (item.TicketDetail != null && (item.TicketDetail.Status != TicketDetailStatus.Valid || item.TicketDetail.FaceVector != null))
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
        item.Ticket.QuantitySold++;
    }

    private BookingDto ToDto(Order o) => new(o.Id, o.OrderCode, o.EventId, o.Event.Title, o.Event.Location,
        o.Event.StartTime, o.ReservationStatus ?? "unknown", o.TotalAmount, DateTime.UtcNow, o.ExpiresAt,
        o.PaymentExpiresAt, o.PaidAt, o.Items.OrderBy(i => i.Id).Select(i => new BookingItemDto(i.Id, i.TicketId,
            i.Ticket.Name, i.UnitPrice, i.Status, i.AttendeeName, i.AttendeeEmail, i.AttendeePhone,
            i.FaceVector != null, i.TicketDetail?.TicketCode, i.TicketDetail?.QrCodeUrl)).ToList(),
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

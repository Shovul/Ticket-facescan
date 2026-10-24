using EventPass.Application.DTOs.Bookings;

namespace EventPass.Application.Interfaces;

public interface IBookingService
{
    Task<CustomerSummaryDto> GetCustomerAsync(int userId, CancellationToken ct);
    Task<BookingDto> ReserveAsync(int userId, ReserveTicketsRequest request, CancellationToken ct);
    Task<BookingDto> GetAsync(int userId, string code, CancellationToken ct);
    Task<BookingDto> UpdateAttendeeAsync(int userId, string code, int itemId, AttendeeRequest request, CancellationToken ct);
    Task<BookingDto> UploadFaceAsync(int userId, string code, int itemId, byte[] image, string contentType, CancellationToken ct);
    Task<BookingDto> ConfirmFreeAsync(int userId, string code, CancellationToken ct);
    Task<BookingDto> CancelAsync(int userId, string code, CancellationToken ct);
    Task ExpireAsync(CancellationToken ct);
}

public interface IBookingPaymentReceiver
{
    Task ConfirmPaymentAsync(PaymentConfirmation payment, CancellationToken ct);
}

public interface IBookingPaymentDetails
{
    bool IsConfigured { get; }
    BookingPaymentDto Create(string orderCode, decimal amount);
}

public interface IBookingFaceImageProtector
{
    byte[] Protect(byte[] image);
}

public interface IBookingEmailSender
{
    Task<bool> SendAsync(BookingEmail message, CancellationToken ct);
}

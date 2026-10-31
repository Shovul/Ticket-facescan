using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Bookings;

public class ReserveTicketsRequest
{
    [Range(1, int.MaxValue)] public int EventId { get; set; }
    [Required, StringLength(64, MinimumLength = 16)] public string RequestKey { get; set; } = string.Empty;
    [Required, MinLength(1), MaxLength(6)] public List<ReserveTicketType> Items { get; set; } = [];
}

public class ReserveTicketType
{
    [Range(1, int.MaxValue)] public int TicketTypeId { get; set; }
    [Range(1, 6)] public int Quantity { get; set; }
}

public class AttendeeRequest
{
    [Required, StringLength(100, MinimumLength = 2)] public string Name { get; set; } = string.Empty;
    [Required, EmailAddress, StringLength(255)] public string Email { get; set; } = string.Empty;
    [Required, RegularExpression("^[0-9]{10}$")] public string Phone { get; set; } = string.Empty;
}

public record BookingItemDto(int Id, int TicketTypeId, string TicketTypeName, decimal UnitPrice,
    string Status, string? AttendeeName, string? AttendeeEmail, string? AttendeePhone,
    bool HasFaceId, string? TicketCode, string? QrCodeUrl, bool HasActiveClaimLink);
public record CustomerSummaryDto(int Id, string FullName, string? AvatarUrl, int TicketCount);
public record BookingPaymentDto(string BankCode, string AccountNumber, string AccountName,
    string Memo, decimal Amount, string QrUrl);
public record BookingDto(int Id, string OrderCode, int EventId, string EventTitle, string Location,
    DateTime StartTime, string Status, decimal TotalAmount, DateTime ServerTime,
    DateTime? ExpiresAt, DateTime? PaymentExpiresAt, DateTime? PaidAt,
    IReadOnlyList<BookingItemDto> Items, BookingPaymentDto? Payment, bool EmailSent);
public record PaymentConfirmation(string OrderCode, decimal Amount, string Reference, DateTime ConfirmedAt);
public record BookingEmail(string Recipient, string OrderCode, string EventTitle, string Location,
    DateTime StartTime, IReadOnlyList<BookingItemDto> Tickets);

public class BookingException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public record ClaimLinkDto(string Token, DateTime ExpiresAt);
public record ClaimTicketDto(string EventTitle, string TicketTypeName, DateTime ExpiresAt, DateTime ServerTime);
public record CustomerTicketDto(string OrderCode, int ItemId, string EventTitle, string Location,
    DateTime StartTime, DateTime EndTime, string Gate, string TicketTypeName, decimal Price,
    string TicketCode, string QrCodeUrl, string? AttendeeName, bool HasFaceId, string Status,
    DateTime? CheckedInAt);
public record CustomerTicketsDto(IReadOnlyList<BookingDto> PendingOrders, IReadOnlyList<CustomerTicketDto> Tickets,
    int Page, int TotalPages, int TotalCount, int AllCount, int FreeCount, int PaidCount, int MissingFaceCount, DateTime ServerTime);
public record DigitalPassDto(CustomerTicketDto Ticket, string? FaceImage);

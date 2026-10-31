using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces;

public interface IAttendeeService
{
    Task<(IEnumerable<TicketDetail> Items, int TotalCount)> GetPagedAttendeesAsync(
        int eventId,
        int pageNumber,
        string? keyword,
        string? ticketClass,
        string? status);

    Task<bool> ManualCheckInAsync(int ticketDetailId);

    Task<bool> ToggleTicketLockAsync(int ticketDetailId);

    Task<byte[]> ExportReconciliationReportAsync(
        int eventId,
        string? keyword,
        string? ticketClass,
        string? status);

}
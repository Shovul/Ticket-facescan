using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using EventPass.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using System.Text;

namespace EventPass.Infrastructure.Repositories;

public class TicketDetailRepository : Repository<TicketDetail>, ITicketDetailRepository, IAttendeeService
{
    private readonly AppDbContext _appDbContext;

    public TicketDetailRepository(AppDbContext context) : base(context)
    {
        _appDbContext = context;
    }

    public async Task<(TicketDetail? Ticket, double Distance)?> FindNearestMatchAsync(
        int eventId, 
        Vector queryVector, 
        CancellationToken cancellationToken = default)
    {
        // Truy vấn 1:N sử dụng pgvector HNSW Index (Cosine Distance)
        var candidate = await _appDbContext.TicketDetails
            .Include(td => td.Ticket)
            .Include(td => td.Event)
            .Where(td => td.EventId == eventId && td.FaceVector != null && !td.IsDeleted)
            .OrderBy(td => td.FaceVector!.CosineDistance(queryVector))
            .Select(td => new
            {
                Ticket = td,
                Distance = td.FaceVector!.CosineDistance(queryVector)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (candidate == null)
            return null;

        return (candidate.Ticket, candidate.Distance);
    }

    public async Task<TicketDetail?> GetByTicketCodeAsync(
        int eventId, 
        string ticketCode, 
        CancellationToken cancellationToken = default)
    {
        return await _appDbContext.TicketDetails
            .Include(td => td.Ticket)
            .Include(td => td.Event)
            .FirstOrDefaultAsync(td => td.EventId == eventId && td.TicketCode == ticketCode && !td.IsDeleted, cancellationToken);
    }

    public async Task<IEnumerable<TicketDetail>> GetTicketsForOfflineSyncAsync(
        int eventId, 
        CancellationToken cancellationToken = default)
    {
        return await _appDbContext.TicketDetails
            .Include(td => td.Ticket)
            .Where(td => td.EventId == eventId && !td.IsDeleted)
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<(int TotalTickets, int CheckedInCount, Event? Event)> GetEventKioskSummaryAsync(
        int eventId, 
        CancellationToken cancellationToken = default)
    {
        var ev = await _appDbContext.Events.FirstOrDefaultAsync(e => e.Id == eventId && !e.IsDeleted, cancellationToken);
        if (ev == null)
            return (0, 0, null);

        var total = await _appDbContext.TicketDetails.CountAsync(td => td.EventId == eventId && !td.IsDeleted, cancellationToken);
        var checkedIn = await _appDbContext.TicketDetails.CountAsync(td => td.EventId == eventId && td.Status == EventPass.Domain.Enums.TicketDetailStatus.CheckedIn && !td.IsDeleted, cancellationToken);

        return (total, checkedIn, ev);
    }
    // 1. Lấy danh sách người tham dự (Lọc đa chiều + Phân trang 6 bản ghi/trang)
    public async Task<(IEnumerable<TicketDetail> Items, int TotalCount)> GetPagedAttendeesAsync(
        int eventId, int pageNumber, string? keyword, string? ticketClass, string? status)
    {
        int pageSize = 6;
        var query = BuildAttendeeQuery(eventId, keyword, ticketClass, status);

        int totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(t => t.Id)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }

    // 2. Điểm danh thủ công bằng tay (Admin)
    public async Task<bool> ManualCheckInAsync(int ticketDetailId)
    {
        var ticket = await _dbSet.FirstOrDefaultAsync(t => t.Id == ticketDetailId && !t.IsDeleted);

        // Chỉ cho phép điểm danh nếu vé ở trạng thái Valid (Chưa check-in)
        if (ticket == null || ticket.Status != TicketDetailStatus.Valid)
        {
            return false;
        }

        ticket.Status = TicketDetailStatus.CheckedIn;
        ticket.CheckedInAt = DateTime.UtcNow;

        await _appDbContext.SaveChangesAsync();
        return true;
    }

    // 3. Khóa / Mở khóa vé linh hoạt (Toggle giữa Valid và Cancelled)
    public async Task<bool> ToggleTicketLockAsync(int ticketDetailId)
    {
        var ticket = await _dbSet.FirstOrDefaultAsync(t => t.Id == ticketDetailId && !t.IsDeleted);

        if (ticket == null) return false;

        // Nếu đang bị Khóa/Hủy (Cancelled) -> Chuyển về Hợp lệ (Valid)
        // Ngược lại -> Chuyển thành Khóa/Hủy (Cancelled)
        ticket.Status = (ticket.Status == TicketDetailStatus.Cancelled)
            ? TicketDetailStatus.Valid
            : TicketDetailStatus.Cancelled;

        await _appDbContext.SaveChangesAsync();
        return true;
    }

    // 4. Kết xuất báo cáo đối soát ra CSV (mã hóa UTF-8 BOM chuẩn tiếng Việt)
    public async Task<byte[]> ExportReconciliationReportAsync(
        int eventId, string? keyword, string? ticketClass, string? status)
    {
        var query = BuildAttendeeQuery(eventId, keyword, ticketClass, status);
        var attendees = await query.ToListAsync();

        var csvBuilder = new StringBuilder();
        csvBuilder.AppendLine("Mã Vé,Họ Tên,Email,SĐT,Hạng Vé,Trạng Thái,Thời Gian Check-in");

        foreach (var a in attendees)
        {
            var checkInTime = a.CheckedInAt.HasValue
                ? a.CheckedInAt.Value.ToString("yyyy-MM-dd HH:mm:ss")
                : "Chưa check-in";

            var ticketName = a.Ticket != null ? a.Ticket.Name : "N/A";

            csvBuilder.AppendLine($"\"{a.TicketCode}\",\"{a.AttendeeName}\",\"{a.AttendeeEmail}\",\"{a.AttendeePhone}\",\"{ticketName}\",\"{a.Status}\",\"{checkInTime}\"");
        }

        byte[] preamble = Encoding.UTF8.GetPreamble();
        byte[] csvBytes = Encoding.UTF8.GetBytes(csvBuilder.ToString());

        byte[] result = new byte[preamble.Length + csvBytes.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(csvBytes, 0, result, preamble.Length, csvBytes.Length);

        return result;
    }

    // Hàm phụ trợ tạo Query theo điều kiện lọc
    private IQueryable<TicketDetail> BuildAttendeeQuery(
        int eventId, string? keyword, string? ticketClass, string? status)
    {
        var query = _dbSet
            .Include(t => t.Ticket)
            .Where(t => t.EventId == eventId && !t.IsDeleted);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLower();
            query = query.Where(t =>
                t.AttendeeName.ToLower().Contains(kw) ||
                t.AttendeeEmail.ToLower().Contains(kw) ||
                (t.AttendeePhone != null && t.AttendeePhone.Contains(kw)) ||
                t.TicketCode.ToLower().Contains(kw));
        }

        if (!string.IsNullOrWhiteSpace(ticketClass))
        {
            query = query.Where(t => t.Ticket.Name.ToLower() == ticketClass.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TicketDetailStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(t => t.Status == parsedStatus);
        }

        return query;
    }
}

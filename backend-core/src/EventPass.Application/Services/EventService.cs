using System.Linq.Expressions;
using EventPass.Application.DTOs.Events;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;

namespace EventPass.Application.Services
{
    public class EventService : IEventService
    {
        private readonly IEventRepository _eventRepo;
        private readonly IRepository<Ticket> _ticketRepo;
        private readonly IRepository<TicketDetail> _ticketDetailRepo;
        private readonly IUserRepository _userRepo;
        private readonly IFileStorageService _fileStorageService;

        public EventService(
            IEventRepository eventRepo,
            IRepository<Ticket> ticketRepo,
            IRepository<TicketDetail> ticketDetailRepo,
            IUserRepository userRepo,
            IFileStorageService fileStorageService)

        {
            _eventRepo = eventRepo;
            _ticketRepo = ticketRepo;
            _ticketDetailRepo = ticketDetailRepo;
            _userRepo = userRepo;
            _fileStorageService = fileStorageService;
        }

        public async Task<Event> CreateEventAsync(CreateEventDto dto)
        {
            var userExists = await _userRepo.GetByIdAsync(dto.OrganizerId);
                if (userExists == null) 
                    throw new ArgumentException("Organizer ID không tồn tại trong hệ thống.");
                    
            if (string.IsNullOrWhiteSpace(dto.OrganizerName) || 
                string.IsNullOrWhiteSpace(dto.OrganizerEmail) || 
                string.IsNullOrWhiteSpace(dto.OrganizerHotline))
            {
                throw new ArgumentException("E2: Thông tin Ban tổ chức (Tên, Email, Hotline) không được để trống.");
            }
            ValidateTimeline(dto);

            if (dto.EventImages.Count > 20) throw new ArgumentException("E3: Chỉ cho phép tải lên tối đa 20 hình ảnh minh họa.");

            if (!dto.Tickets.Any()) throw new ArgumentException("E4: Cần duy trì tối thiểu 1 phân hạng vé.");

            if (!dto.Kiosks.Any()) throw new ArgumentException("E4: Cần duy trì tối thiểu 1 trạm Kiosk.");

            string? logoUrl = null;
            if (dto.OrganizerLogo != null && dto.OrganizerLogo.Length > 0)
            {
                logoUrl = await _fileStorageService.SaveFileAsync(dto.OrganizerLogo, "Events/Logos");
            }

            var uploadedImageUrls = new List<string>();
            foreach (var imageFile in dto.EventImages)
            {
                if (imageFile != null && imageFile.Length > 0)
                {
                    string url = await _fileStorageService.SaveFileAsync(imageFile, "Events/Gallery");
                    uploadedImageUrls.Add(url);
                }
            }

            var newEvent = new Event
            {
                OrganizerId = dto.OrganizerId,
                OrganizerName = dto.OrganizerName,
                OrganizerEmail = dto.OrganizerEmail,
                OrganizerHotline = dto.OrganizerHotline,
                OrganizerWebsite = dto.OrganizerWebsite,
                OrganizerLegalId = dto.OrganizerLegalId,
                OrganizerLogo = logoUrl,
                
                Title = dto.Title,
                Description = dto.Description,
                EventSpeakers = dto.EventSpeakers,
                Location = dto.Location,
                CoverImage = uploadedImageUrls.FirstOrDefault(),
                
                StartTime = dto.StartTime.ToUniversalTime(),
                EndTime = dto.EndTime.ToUniversalTime(),
                PublicTime = dto.PublicTime.ToUniversalTime(),
                OpenTicketTime = dto.OpenTicketTime.ToUniversalTime(),
                CloseTicketTime = dto.CloseTicketTime.ToUniversalTime(),
                OpenKioskTime = dto.OpenKioskTime.ToUniversalTime(),
                
                EmailSubject = dto.EmailSubject,
                EmailCheckinNote = dto.EmailCheckinNote,
                
                Status = EventStatus.Upcoming,
                EventImages = uploadedImageUrls
            };

            foreach (var t in dto.Tickets)
            {
                newEvent.Tickets.Add(new Ticket
                {
                    Name = t.Name,   
                    Price = t.Price, 
                    Quantity = t.Quantity,
                    Description = t.Description,
                    QuantitySold = 0 
                });
            }

            foreach (var k in dto.Kiosks)
            {
                newEvent.Kiosks.Add(new Kiosk 
                { 
                    Name = string.IsNullOrWhiteSpace(k.Name) ? "Kiosk Cổng 1" : k.Name,
                    Location = k.Location,
                    SecretToken = !string.IsNullOrEmpty(k.SecretToken) ? k.SecretToken : $"stk_{Guid.NewGuid():N}"[..12], 
                    IsActive = true
                });
            }

            await _eventRepo.AddAsync(newEvent);
            await _eventRepo.SaveChangesAsync();

            return newEvent;
        }



        public async Task<Event> UpdateEventAsync(int eventId, CreateEventDto dto)
        {
            var existingEvent = await _eventRepo.GetEventWithDetailsAsync(eventId);

            if (existingEvent == null) throw new KeyNotFoundException("Không tìm thấy sự kiện.");

            existingEvent.OrganizerName = dto.OrganizerName;
            existingEvent.OrganizerEmail = dto.OrganizerEmail;
            existingEvent.OrganizerHotline = dto.OrganizerHotline;
            existingEvent.OrganizerWebsite = dto.OrganizerWebsite;
            existingEvent.OrganizerLegalId = dto.OrganizerLegalId;

            if (dto.OrganizerLogo != null && dto.OrganizerLogo.Length > 0)
            {
                if (!string.IsNullOrEmpty(existingEvent.OrganizerLogo)) { await _fileStorageService.DeleteFileAsync(existingEvent.OrganizerLogo); }

                existingEvent.OrganizerLogo = await _fileStorageService.SaveFileAsync(dto.OrganizerLogo, "Events/Logos");
            }

            ValidateTimeline(dto);

            if (dto.EventImages != null && dto.EventImages.Count > 0)
            {
                if (dto.EventImages.Count > 20) 
                    throw new ArgumentException("E2: Vượt quá 20 ảnh.");

                var uploadedImageUrls = new List<string>();
                foreach (var imageFile in dto.EventImages)
                {
                    if (imageFile != null && imageFile.Length > 0)
                    {
                        string url = await _fileStorageService.SaveFileAsync(imageFile, "Events/Gallery");
                        uploadedImageUrls.Add(url);
                    }
                }

                existingEvent.EventImages = uploadedImageUrls;
                existingEvent.CoverImage = uploadedImageUrls.FirstOrDefault();
            }

            existingEvent.Title = dto.Title;
            existingEvent.Description = dto.Description;
            existingEvent.EventSpeakers = dto.EventSpeakers;
            existingEvent.Location = dto.Location;
            existingEvent.StartTime = dto.StartTime.ToUniversalTime();
            existingEvent.EndTime = dto.EndTime.ToUniversalTime();
            
            if (dto.PublicTime != default) existingEvent.PublicTime = dto.PublicTime.ToUniversalTime();
            if (dto.OpenTicketTime != default) existingEvent.OpenTicketTime = dto.OpenTicketTime.ToUniversalTime();
            if (dto.CloseTicketTime != default) existingEvent.CloseTicketTime = dto.CloseTicketTime.ToUniversalTime();
            if (dto.OpenKioskTime != default) existingEvent.OpenKioskTime = dto.OpenKioskTime.ToUniversalTime();

            existingEvent.EmailSubject = dto.EmailSubject;
            existingEvent.EmailCheckinNote = dto.EmailCheckinNote;

            await _eventRepo.UpdateAsync(existingEvent);
            await _eventRepo.SaveChangesAsync();

            return existingEvent;
        }



        public async Task CancelEventAsync(int eventId, string reason, bool isConfirmed)
        {
            if (!isConfirmed || string.IsNullOrWhiteSpace(reason) || reason.Length < 10)
            {
                throw new ArgumentException("E3: Vui lòng xác nhận cam kết và cung cấp lý do hủy tối thiểu 10 ký tự.");
            }

            var existingEvent = await _eventRepo.GetByIdAsync(eventId);

            if (existingEvent == null) throw new KeyNotFoundException("Không tìm thấy sự kiện.");

            existingEvent.Status = EventStatus.Cancelled;

            var (ticketDetails, _) = await _ticketDetailRepo.GetPagedAsync(1, 10000, t => t.EventId == eventId);

            foreach (var ticketDetail in ticketDetails)
            {
                ticketDetail.Status = TicketDetailStatus.Cancelled;
                await _ticketDetailRepo.UpdateAsync(ticketDetail);
            }

            await _eventRepo.UpdateAsync(existingEvent);
            await _eventRepo.SaveChangesAsync();
            

            // TODO: Kích hoạt hệ thống gửi Email thông báo hủy sự kiện cho User

        }



        public Task<string> RefreshKioskTokenAsync(int kioskId, string adminPassword)
        {

            if (adminPassword != "Hardcoded_Or_Hashed_Admin_Password") 
            {
                throw new UnauthorizedAccessException("E4: Mật khẩu quản trị viên không chính xác.");
            }

            string newToken = Guid.NewGuid().ToString("N");

            // TODO: Cập nhật newToken vào cơ sở dữ liệu cho trạm Kiosk tương ứng

            return Task.FromResult(newToken);
        }

        private void ValidateTimeline(CreateEventDto dto)
        {
            if (dto.OpenTicketTime < dto.PublicTime)
                throw new ArgumentException("E1: Thời gian Mở bán vé không được trước thời gian Công khai Web.");

            if (dto.CloseTicketTime < dto.OpenTicketTime)
                throw new ArgumentException("E1: Thời gian Đóng bán vé không được trước thời gian Mở bán vé.");

            if (dto.OpenKioskTime < dto.CloseTicketTime)
                throw new ArgumentException("E1: Thời gian Mở Kiosk check-in không được trước thời gian Đóng bán vé.");

            if (dto.StartTime < dto.OpenKioskTime)

                throw new ArgumentException("E1: Thời gian Bắt đầu sự kiện không được trước thời gian Mở Kiosk.");

            if (dto.EndTime <= dto.StartTime)
                throw new ArgumentException("E1: Thời gian Kết thúc phải diễn ra sau Thời gian Bắt đầu sự kiện.");
        }

        public async Task<PaginatedEventResponse> GetEventsAsync(int page, int pageSize, string search, string status)
        {
            Expression<Func<Event, bool>> filter = e => 
                string.IsNullOrWhiteSpace(search) || 
                e.Title.Contains(search) || 
                e.Location.Contains(search);

            var (events, totalCount) = await _eventRepo.GetPagedAsync(
                pageNumber: page,
                pageSize: pageSize,
                filter: filter,
                orderBy: q => q.OrderByDescending(e => e.CreatedAt), 
                includeProperties: "Tickets"
            );

            var items = events.Select(e => new EventSummaryDto
            {
                Id = e.Id,
                Title = e.Title,
                Status = e.Status.ToString().ToLower(),
                StatusText = e.Status.ToString(), 
                StartTime = e.StartTime,
                Location = e.Location,
                CoverImage = e.EventImages?.FirstOrDefault() ?? "",
                
                Total = e.Tickets.Sum(t => t.Quantity),
                Sold = e.Tickets.Sum(t => t.QuantitySold)
            }).ToList();

            return new PaginatedEventResponse
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<Event> GetEventByIdAsync(int id)
        {
            var eventDetail = await _eventRepo.GetEventWithDetailsAsync(id);
            if (eventDetail == null) throw new KeyNotFoundException("Không tìm thấy sự kiện.");
            return eventDetail;
        }
    }
}
using EventPass.Application.DTOs.Events;
using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces
{
    public interface IEventService
    {
        Task<Event> CreateEventAsync(CreateEventDto dto);
        
        Task<Event> UpdateEventAsync(int eventId, CreateEventDto dto);
        
        Task CancelEventAsync(int eventId, string reason, bool isConfirmed);
        
        Task<string> RefreshKioskTokenAsync(int kioskId, string adminPassword);
    }
}
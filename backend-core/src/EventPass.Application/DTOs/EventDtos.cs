using EventPass.Domain.Enums;

namespace EventPass.Application.DTOs.Events
{
    public class CreateEventDto
    {
        public int OrganizerId { get; set; }
        public string OrganizerName { get; set; } = string.Empty;
        public string OrganizerEmail { get; set; } = string.Empty;
        public string OrganizerHotline { get; set; } = string.Empty;

        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        
        public List<string> EventImages { get; set; } = new List<string>();

        public DateTime PublicTime { get; set; }
        public DateTime OpenTicketTime { get; set; }
        public DateTime CloseTicketTime { get; set; }
        public DateTime OpenKioskTime { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public List<CreateTicketDto> Tickets { get; set; } = new List<CreateTicketDto>();

        public List<CreateKioskDto> Kiosks { get; set; } = new List<CreateKioskDto>();
    }

    public class CreateTicketDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
    }

    public class CreateKioskDto
    {
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }
}
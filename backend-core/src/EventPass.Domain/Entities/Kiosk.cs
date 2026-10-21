namespace EventPass.Domain.Entities;

public class Kiosk : BaseEntity
{
    public int EventId { get; set; }
    public string Name { get; set; } = "Kiosk Cổng 1";
    public string? Location { get; set; }
    public string SecretToken { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public Event Event { get; set; } = null!;
}

using Microsoft.AspNetCore.SignalR;

namespace EventPass.API.Hubs;

public class KioskHub : Hub
{
    public async Task JoinEventRoom(int eventId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"event_{eventId}");
    }

    public async Task LeaveEventRoom(int eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"event_{eventId}");
    }
}

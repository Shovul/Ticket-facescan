using Microsoft.AspNetCore.SignalR;

namespace EventPass.API.Hubs;

public class TransactionHub : Hub
{
    // Hub quản lý kết nối Realtime cho Dashboard Lịch sử Giao dịch
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }
}
using EventPass.Application.Interfaces;

namespace EventPass.API.Services;

public class BookingExpirationWorker(IServiceScopeFactory scopes, ILogger<BookingExpirationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<IBookingService>().ExpireAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "Chưa xử lý được đơn giữ chỗ hết hạn, sẽ thử lại."); }
            try { if (!await timer.WaitForNextTickAsync(stoppingToken)) break; }
            catch (OperationCanceledException) { break; }
        }
    }
}

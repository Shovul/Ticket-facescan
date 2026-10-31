using EventPass.Application.DTOs;

namespace EventPass.Application.Interfaces;

public interface ITransactionService
{
    Task<(IEnumerable<TransactionDto> Items, int TotalCount)> GetPagedTransactionsAsync(
        int pageNumber, string? keyword, string? status);

    // Trả về tuple (bool Success, TransactionDto? Transaction) để truyền thông tin cho Controller bắn SignalR
    Task<(bool Success, TransactionDto? Transaction)> ProcessSePayWebhookAsync(SePayWebhookPayload payload);
}
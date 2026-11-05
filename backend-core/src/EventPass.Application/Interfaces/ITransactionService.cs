using EventPass.Application.DTOs;

namespace EventPass.Application.Interfaces;

public interface ITransactionService
{
    Task<(IEnumerable<TransactionDto> Items, int TotalCount)> GetPagedTransactionsAsync(
        int pageNumber, string? keyword, string? status);
}

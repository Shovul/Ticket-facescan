using EventPass.API.Hubs;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace EventPass.API.Controllers;

[ApiController]
[Route("api/admin/transactions")]
public class TransactionsController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    private readonly IHubContext<TransactionHub> _hubContext;

    public TransactionsController(
        ITransactionService transactionService,
        IHubContext<TransactionHub> hubContext)
    {
        _transactionService = transactionService;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] int pageNumber = 1,
        [FromQuery] string? keyword = null,
        [FromQuery] string? status = null)
    {
        var (items, totalCount) = await _transactionService.GetPagedTransactionsAsync(
            pageNumber, keyword, status);

        return Ok(new
        {
            Items = items,
            TotalCount = totalCount,
            PageSize = 6,
            CurrentPage = pageNumber
        });
    }
}

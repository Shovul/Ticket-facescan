using EventPass.API.Hubs;
using EventPass.Application.DTOs;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
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

    [HttpPost("webhook/sepay")]
    [AllowAnonymous]
    public async Task<IActionResult> ReceiveSePayWebhook([FromBody] SePayWebhookPayload payload)
    {
        var (success, transaction) = await _transactionService.ProcessSePayWebhookAsync(payload);
        if (!success || transaction == null)
        {
            return BadRequest(new { Success = false, Message = "Không tìm thấy đơn hàng hoặc payload không hợp lệ." });
        }

        // BẮN TÍN HIỆU SIGNALR REALTIME TẠI TẦNG API
        await _hubContext.Clients.All.SendAsync("ReceiveNewTransaction", transaction);

        return Ok(new
        {
            Success = true,
            Message = "Ghi nhận thanh toán VietQR thành công.",
            ReferenceCode = payload.ReferenceCode,
            Amount = payload.TransferAmount
        });
    }
}
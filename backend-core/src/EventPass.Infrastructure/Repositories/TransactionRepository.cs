using EventPass.Application.DTOs;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace EventPass.Infrastructure.Repositories;

public class TransactionRepository : Repository<Order>, ITransactionService
{
	private readonly AppDbContext _appDbContext;

	public TransactionRepository(AppDbContext context) : base(context)
	{
		_appDbContext = context;
	}

	public async Task<(IEnumerable<TransactionDto> Items, int TotalCount)> GetPagedTransactionsAsync(
		int pageNumber, string? keyword, string? status)
	{
		int pageSize = 6;

		var query = _dbSet
			.Include(o => o.User)
			.Include(o => o.Event)
			.Where(o => !o.IsDeleted);

		if (!string.IsNullOrWhiteSpace(keyword))
		{
			var kw = keyword.Trim().ToLower();
			query = query.Where(o =>
				o.Id.ToString().Contains(kw) ||
				(o.TransactionCode != null && o.TransactionCode.ToLower().Contains(kw)) ||
				(o.User != null && o.User.Email.ToLower().Contains(kw)));
		}

		int totalCount = await query.CountAsync();

		var items = await query
			.OrderByDescending(o => o.CreatedAt)
			.Skip((pageNumber - 1) * pageSize)
			.Take(pageSize)
			.Select(o => new TransactionDto
			{
				Id = o.Id,
				OrderId = o.Id,
				TransactionCode = o.TransactionCode ?? $"TXN-{o.Id}",
				Amount = o.TotalAmount,
				PaymentMethod = o.PaymentMethod ?? "VietQR",
				Status = o.PaymentStatus.ToString(),
				CreatedAt = o.CreatedAt,
				BuyerEmail = o.User != null ? o.User.Email : "N/A",
				EventTitle = o.Event != null ? o.Event.Title : "N/A"
			})
			.ToListAsync();

		return (items, totalCount);
	}

	public async Task<(bool Success, TransactionDto? Transaction)> ProcessSePayWebhookAsync(SePayWebhookPayload payload)
	{
		if (payload == null || string.IsNullOrWhiteSpace(payload.Content))
			return (false, null);

		var content = payload.Content.Trim();
		Order? order = null;

		// 1. Thử tìm Order theo mã giao dịch
		order = await _dbSet
			.Include(o => o.User)
			.Include(o => o.Event)
			.FirstOrDefaultAsync(o =>
				!o.IsDeleted &&
				o.TransactionCode != null &&
				o.TransactionCode != "" &&
				content.Contains(o.TransactionCode));

		// 2. Thử tìm theo mã EP1001
		if (order == null)
		{
			var epMatch = Regex.Match(content, @"EP\s*(\d+)", RegexOptions.IgnoreCase);
			if (epMatch.Success && int.TryParse(epMatch.Groups[1].Value, out int extractedEpId))
			{
				order = await _dbSet
					.Include(o => o.User)
					.Include(o => o.Event)
					.FirstOrDefaultAsync(o => !o.IsDeleted && o.Id == extractedEpId);
			}
		}

		// 3. Thử tìm theo ID số
		if (order == null)
		{
			var numberMatches = Regex.Matches(content, @"\b\d+\b");
			foreach (Match match in numberMatches)
			{
				if (int.TryParse(match.Value, out int possibleId))
				{
					order = await _dbSet
						.Include(o => o.User)
						.Include(o => o.Event)
						.FirstOrDefaultAsync(o => !o.IsDeleted && o.Id == possibleId);
					if (order != null) break;
				}
			}
		}

		if (order == null)
			return (false, null);

		// Cập nhật trạng thái Đơn hàng
		order.PaymentStatus = Domain.Enums.PaymentStatus.Success;
		if (!string.IsNullOrWhiteSpace(payload.ReferenceCode))
		{
			order.TransactionCode = payload.ReferenceCode;
		}

		// Cập nhật trạng thái Vé
		var tickets = await _appDbContext.Set<TicketDetail>()
			.Where(t => t.OrderId == order.Id)
			.ToListAsync();

		foreach (var ticket in tickets)
		{
			if (ticket.Status == Domain.Enums.TicketDetailStatus.Cancelled)
			{
				ticket.Status = Domain.Enums.TicketDetailStatus.Valid;
			}
		}

		await _appDbContext.SaveChangesAsync();

		var resultDto = new TransactionDto
		{
			Id = order.Id,
			OrderId = order.Id,
			TransactionCode = order.TransactionCode ?? $"TXN-{order.Id}",
			Amount = payload.TransferAmount,
			PaymentMethod = "VietQR",
			Status = "Success",
			CreatedAt = DateTime.UtcNow,
			BuyerEmail = order.User != null ? order.User.Email : "N/A",
			EventTitle = order.Event != null ? order.Event.Title : "N/A"
		};

		return (true, resultDto);
	}
}
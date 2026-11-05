using EventPass.Application.DTOs;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

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
}

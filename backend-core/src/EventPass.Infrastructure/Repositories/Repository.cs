using Microsoft.EntityFrameworkCore;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using System.Linq.Expressions;

namespace EventPass.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly DbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(DbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        return await _dbSet.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.Where(e => !e.IsDeleted).ToListAsync();
    }

    public virtual async Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int pageNumber, 
        int pageSize, 
        Expression<Func<T, bool>>? filter = null, 
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null, 
        string includeProperties = "")
    {
        IQueryable<T> query = _dbSet.Where(e => !e.IsDeleted);

        if (filter != null)
        {
            query = query.Where(filter);
        }

        foreach (var includeProperty in includeProperties.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
        {
            query = query.Include(includeProperty.Trim());
        }

        int totalCount = await query.CountAsync();

        if (orderBy != null)
        {
            query = orderBy(query);
        }

        var items = await query.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();

        return (items, totalCount);
    }

    public virtual async Task AddAsync(T entity)
    {
        entity.CreatedAt = DateTime.UtcNow;
        await _dbSet.AddAsync(entity);
    }

    public virtual async Task UpdateAsync(T entity)
    {
        entity.UpdatedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await Task.CompletedTask;
    }

    public virtual async Task SoftDeleteAsync(T entity)
    {
        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        _dbSet.Update(entity);
        await Task.CompletedTask;
    }

    public virtual async Task PermanentDeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        await Task.CompletedTask;
    }

    public virtual async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }
}
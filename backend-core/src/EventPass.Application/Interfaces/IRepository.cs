using System.Linq.Expressions;

namespace EventPass.Application.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    
    Task<(IEnumerable<T> Items, int TotalCount)> GetPagedAsync(
        int pageNumber, 
        int pageSize, 
        Expression<Func<T, bool>>? filter = null, 
        Func<IQueryable<T>, IOrderedQueryable<T>>? orderBy = null, 
        string includeProperties = ""
    );

    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task SoftDeleteAsync(T entity);
    Task PermanentDeleteAsync(T entity);
    Task<int> SaveChangesAsync();
}
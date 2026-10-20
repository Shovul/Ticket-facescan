using Microsoft.EntityFrameworkCore;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;

namespace EventPass.Infrastructure.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted);
    }

    public async Task<bool> IsEmailUniqueAsync(string email)
    {
        return !await _dbSet.AnyAsync(u => u.Email == email && !u.IsDeleted);
    }
}
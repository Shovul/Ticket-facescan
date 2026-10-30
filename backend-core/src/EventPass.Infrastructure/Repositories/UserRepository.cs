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
        return await _dbSet.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower() && !u.IsDeleted);
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower() && !u.IsDeleted);
    }

    public async Task<User?> GetByGoogleIdAsync(string googleId)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.GoogleId == googleId && !u.IsDeleted);
    }

    public async Task<User?> GetByResetTokenAsync(string resetToken)
    {
        return await _dbSet.FirstOrDefaultAsync(u => u.PasswordResetToken == resetToken && !u.IsDeleted);
    }

    public async Task<bool> IsEmailUniqueAsync(string email)
    {
        return !await _dbSet.AnyAsync(u => u.Email.ToLower() == email.ToLower() && !u.IsDeleted);
    }

    public async Task<bool> IsUsernameUniqueAsync(string username)
    {
        return !await _dbSet.AnyAsync(u => u.Username.ToLower() == username.ToLower() && !u.IsDeleted);
    }
}

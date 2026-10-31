using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces;

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByGoogleIdAsync(string googleId);
    Task<User?> GetByResetTokenAsync(string resetToken);
    Task<bool> IsEmailUniqueAsync(string email);
    Task<bool> IsUsernameUniqueAsync(string username);
}

using EventPass.Domain.Entities;

namespace EventPass.Application.Interfaces;

public interface IUserRepository : IRepository<User>
{
    // Add specific methods that only belong to the User entity
    Task<User?> GetByEmailAsync(string email);
    Task<bool> IsEmailUniqueAsync(string email);
}
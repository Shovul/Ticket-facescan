using EventPass.Domain.Enums;
using Pgvector;
using System.ComponentModel.DataAnnotations.Schema;

namespace EventPass.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string? GoogleId { get; set; }
    [NotMapped]
    public bool HasPassword => !string.IsNullOrEmpty(PasswordHash);
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.User;
    public Vector? FaceVector { get; set; }

    // Refresh Token & Quen mat khau
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? ResetTokenExpires { get; set; }

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}

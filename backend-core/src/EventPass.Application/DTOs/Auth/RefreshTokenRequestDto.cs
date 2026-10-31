using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Auth;

public class RefreshTokenRequestDto
{
    [Required(ErrorMessage = "Thiáº¿u Refresh Token trong request.")]
    public string RefreshToken { get; set; } = string.Empty;
}


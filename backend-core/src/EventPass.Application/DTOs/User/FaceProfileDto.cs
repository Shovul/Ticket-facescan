using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace EventPass.Application.DTOs.User;

public class FaceProfileRequestDto
{
    [Required(ErrorMessage = "Tệp ảnh chân dung là bắt buộc.")]
    public IFormFile File { get; set; } = null!;
}

public class FaceProfileResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool FaceIdReady { get; set; }
}

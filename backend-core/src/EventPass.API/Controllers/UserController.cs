using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EventPass.Application.DTOs.Common;
using EventPass.Application.DTOs.User;
using EventPass.Application.Interfaces;

namespace EventPass.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/user")]
[Route("api/v1/users")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    // Danh sách định dạng tệp ảnh hợp lệ
    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    private static readonly string[] AllowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/pjpeg"];
    private const long MaxFileSize = 10 * 1024 * 1024; // 10 MB
    private const long MinFileSize = 5 * 1024;        // 5 KB

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out int userId) ? userId : 0;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized(ApiResponse<UserProfileResponseDto>.Fail("Không xác thực được người dùng."));

        var result = await _userService.GetProfileAsync(userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized(ApiResponse<UserProfileResponseDto>.Fail("Không xác thực được người dùng."));

        var result = await _userService.UpdateProfileAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized(ApiResponse<bool>.Fail("Không xác thực được người dùng."));

        var result = await _userService.ChangePasswordAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// UC05: Nạp ảnh trích xuất Face ID cá nhân và lưu trữ avatar
    /// Hỗ trợ cả 2 endpoint: POST /api/v1/users/face và POST /api/v1/user/face-profile
    /// </summary>
    [HttpPost("face")]
    [HttpPost("face-profile")]
    public async Task<IActionResult> UploadFaceProfile([FromForm] FaceProfileRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized(ApiResponse<FaceProfileResponseDto>.Fail("Không xác thực được người dùng."));

        // 1. Kiểm tra tồn tại tệp
        if (request?.File == null || request.File.Length == 0)
            return BadRequest(ApiResponse<FaceProfileResponseDto>.Fail("Vui lòng tải lên tệp ảnh chân dung rõ nét."));

        // 2. Kiểm tra dung lượng tệp (5KB - 10MB)
        if (request.File.Length > MaxFileSize)
            return BadRequest(ApiResponse<FaceProfileResponseDto>.Fail("Dung lượng tệp ảnh không được vượt quá 10MB."));

        if (request.File.Length < MinFileSize)
            return BadRequest(ApiResponse<FaceProfileResponseDto>.Fail("Dung lượng tệp ảnh quá nhỏ hoặc bị hỏng (yêu cầu tối thiểu 5KB)."));

        // 3. Kiểm tra phần mở rộng tệp (File Extension)
        var ext = Path.GetExtension(request.File.FileName)?.ToLowerInvariant();
        if (string.IsNullOrEmpty(ext) || !AllowedExtensions.Contains(ext))
            return BadRequest(ApiResponse<FaceProfileResponseDto>.Fail("Định dạng tệp không được hỗ trợ. Chỉ chấp nhận các định dạng ảnh: .jpg, .jpeg, .png, .webp."));

        // 4. Kiểm tra Content-Type (MIME type)
        var contentType = request.File.ContentType?.ToLowerInvariant();
        if (!string.IsNullOrEmpty(contentType) && !AllowedMimeTypes.Contains(contentType))
            return BadRequest(ApiResponse<FaceProfileResponseDto>.Fail("Loại tệp không hợp lệ. Vui lòng tải lên đúng định dạng ảnh."));

        using var stream = request.File.OpenReadStream();
        var result = await _userService.UpdateFaceProfileAsync(userId, stream, request.File.FileName);

        return result.Success ? Ok(result) : BadRequest(result);
    }
}

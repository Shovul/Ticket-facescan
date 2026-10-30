using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EventPass.Application.DTOs.Common;
using EventPass.Application.DTOs.User;
using EventPass.Application.Interfaces;

namespace EventPass.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

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

    // UC05: Nạp ảnh trích xuất Face ID cá nhân
    [HttpPost("face-profile")]
    public async Task<IActionResult> UploadFaceProfile([FromForm] FaceProfileRequestDto request)
    {
        var userId = GetCurrentUserId();
        if (userId <= 0)
            return Unauthorized(ApiResponse<FaceProfileResponseDto>.Fail("Không xác thực được người dùng."));

        if (request.File == null || request.File.Length == 0)
            return BadRequest(ApiResponse<FaceProfileResponseDto>.Fail("Vui lòng tải lên tệp ảnh chân dung rõ nét."));

        using var stream = request.File.OpenReadStream();
        var result = await _userService.UpdateFaceProfileAsync(userId, stream, request.File.FileName);

        return result.Success ? Ok(result) : BadRequest(result);
    }
}

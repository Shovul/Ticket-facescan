using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using EventPass.Application.DTOs.Auth;
using EventPass.Application.DTOs.Common;
using EventPass.Application.Interfaces;

namespace EventPass.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.LoginAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto request)
    {
        if (string.IsNullOrEmpty(request.RefreshToken))
            return BadRequest(ApiResponse<string>.Fail("Thiếu Refresh Token trong request."));

        var result = await _authService.RefreshTokenAsync(request.RefreshToken);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.ForgotPasswordAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.ResetPasswordAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            return Unauthorized(ApiResponse<bool>.Fail("Không xác định được danh tính người dùng."));

        var result = await _authService.LogoutAsync(userId);
        return Ok(result);
    }

    [HttpPost("google-login")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequestDto request)
    {
        if (string.IsNullOrEmpty(request.IdToken))
            return BadRequest(ApiResponse<LoginResponseDto>.Fail("Thiếu Google ID Token."));

        var result = await _authService.GoogleLoginAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

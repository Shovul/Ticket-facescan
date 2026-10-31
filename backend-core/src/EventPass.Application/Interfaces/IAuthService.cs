using EventPass.Application.DTOs.Auth;
using EventPass.Application.DTOs.Common;

namespace EventPass.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<RegisterResponseDto>> RegisterAsync(RegisterRequestDto request);
    Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request);
    Task<ApiResponse<LoginResponseDto>> RefreshTokenAsync(string refreshToken);
    Task<ApiResponse<bool>> ForgotPasswordAsync(ForgotPasswordRequestDto request);
    Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto request);
    Task<ApiResponse<bool>> LogoutAsync(int userId);
    Task<ApiResponse<LoginResponseDto>> GoogleLoginAsync(GoogleLoginRequestDto request);
}

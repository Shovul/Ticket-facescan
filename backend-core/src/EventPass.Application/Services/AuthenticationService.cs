using System.Text.Json;
using Microsoft.Extensions.Configuration;
using EventPass.Application.DTOs.Auth;
using EventPass.Application.DTOs.Common;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;

namespace EventPass.Application.Services;

public partial class AuthenticationService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public AuthenticationService(
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _emailService = emailService;
        _configuration = configuration;
    }

    public async Task<ApiResponse<RegisterResponseDto>> RegisterAsync(RegisterRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email))
            return ApiResponse<RegisterResponseDto>.Fail("Tên đăng nhập và Email không được để trống.");

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
            return ApiResponse<RegisterResponseDto>.Fail("Mật khẩu phải từ 6 ký tự trở lên.");

        if (request.Password != request.ConfirmPassword)
            return ApiResponse<RegisterResponseDto>.Fail("Mật khẩu xác nhận không trùng khớp.");

        if (!await _userRepository.IsUsernameUniqueAsync(request.Username.Trim()))
            return ApiResponse<RegisterResponseDto>.Fail("Tên đăng nhập đã tồn tại trong hệ thống.");

        if (!await _userRepository.IsEmailUniqueAsync(request.Email.Trim()))
            return ApiResponse<RegisterResponseDto>.Fail("Email đã được sử dụng bởi tài khoản khác.");

        var user = new User
        {
            Username = request.Username.Trim(),
            Email = request.Email.Trim().ToLower(),
            FullName = request.FullName.Trim(),
            Phone = request.PhoneNumber?.Trim(),
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Role = UserRole.User
        };

        await _userRepository.AddAsync(user);

        var response = new RegisterResponseDto
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            CreatedAt = user.CreatedAt
        };

        return ApiResponse<RegisterResponseDto>.Ok(response, "Đăng ký tài khoản thành công!");
    }

    public async Task<ApiResponse<LoginResponseDto>> LoginAsync(LoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return ApiResponse<LoginResponseDto>.Fail("Tên đăng nhập hoặc mật khẩu không được để trống.");

        var user = await _userRepository.GetByUsernameAsync(request.Username.Trim())
                   ?? await _userRepository.GetByEmailAsync(request.Username.Trim());

        if (user == null || string.IsNullOrEmpty(user.PasswordHash) ||
            !_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return ApiResponse<LoginResponseDto>.Fail("Tên đăng nhập hoặc mật khẩu không chính xác.");
        }

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7); // NFR07: Refresh Token 7 ngay
        await _userRepository.UpdateAsync(user);

        var response = new LoginResponseDto
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            HasPassword = user.HasPassword,
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };

        return ApiResponse<LoginResponseDto>.Ok(response, "Đăng nhập thành công!");
    }

    public async Task<ApiResponse<LoginResponseDto>> RefreshTokenAsync(string refreshToken)
    {
        var users = await _userRepository.GetAllAsync();
        var user = users.FirstOrDefault(u => u.RefreshToken == refreshToken && !u.IsDeleted);

        if (user == null || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            return ApiResponse<LoginResponseDto>.Fail("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _userRepository.UpdateAsync(user);

        var response = new LoginResponseDto
        {
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role.ToString(),
            HasPassword = user.HasPassword,
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken
        };

        return ApiResponse<LoginResponseDto>.Ok(response, "Làm mới phiên thành công!");
    }

    public async Task<ApiResponse<bool>> ForgotPasswordAsync(ForgotPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Email))
            return ApiResponse<bool>.Fail("Tên đăng nhập và Email không được để trống.");

        var user = await _userRepository.GetByUsernameAsync(request.Username.Trim());

        // BR01: Luon phan hoi trung lap bao mat
        if (user == null || !user.Email.Equals(request.Email.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            return ApiResponse<bool>.Ok(true, "Nếu thông tin chính xác, liên kết đặt lại mật khẩu đã được gửi về email của bạn.");
        }

        var resetToken = Guid.NewGuid().ToString("N");
        user.PasswordResetToken = resetToken;
        user.ResetTokenExpires = DateTime.UtcNow.AddMinutes(15); // NFR08: Token 15 phut
        await _userRepository.UpdateAsync(user);

        try
        {
            var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:3000";
            var resetLink = $"{frontendUrl.TrimEnd('/')}/reset-password?token={resetToken}";
            var emailBody = $"<p>Chào <b>{user.FullName}</b>,</p>" +
                            $"<p>Bạn vừa yêu cầu khôi phục mật khẩu tài khoản EventPass. Vui lòng nhấn vào liên kết bên dưới để đặt lại mật khẩu (hiệu lực trong 15 phút):</p>" +
                            $"<p><a href='{resetLink}' style='background:#0d9488;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;display:inline-block;'>Đặt lại mật khẩu</a></p>" +
                            $"<p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email.</p>";

            await _emailService.SendEmailAsync(user.Email, "[EventPass] Yêu cầu đặt lại mật khẩu", emailBody);
        }
        catch
        {
            // Logging
        }

        return ApiResponse<bool>.Ok(true, "Nếu thông tin chính xác, liên kết đặt lại mật khẩu đã được gửi về email của bạn.");
    }

    public async Task<ApiResponse<bool>> ResetPasswordAsync(ResetPasswordRequestDto request)
    {
        var user = await _userRepository.GetByResetTokenAsync(request.Token);
        if (user == null || user.ResetTokenExpires < DateTime.UtcNow)
            return ApiResponse<bool>.Fail("Liên kết xác thực không hợp lệ hoặc đã hết hạn. Vui lòng tạo yêu cầu mới.");

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            return ApiResponse<bool>.Fail("Mật khẩu mới phải từ 6 ký tự trở lên.");

        if (request.NewPassword != request.ConfirmPassword)
            return ApiResponse<bool>.Fail("Mật khẩu xác nhận không trùng khớp.");

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.PasswordResetToken = null;
        user.ResetTokenExpires = null;
        user.RefreshToken = null; // BR03: Huy cac phien cu
        await _userRepository.UpdateAsync(user);

        return ApiResponse<bool>.Ok(true, "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.");
    }

    public async Task<ApiResponse<bool>> LogoutAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userRepository.UpdateAsync(user);
        }
        return ApiResponse<bool>.Ok(true, "Đăng xuất thành công.");
    }

    }

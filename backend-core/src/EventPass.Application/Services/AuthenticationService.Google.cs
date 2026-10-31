using System.Text.Json;
using System.Net.Http.Headers;
using EventPass.Application.DTOs.Auth;
using EventPass.Application.DTOs.Common;
using EventPass.Application.Interfaces;
using EventPass.Domain.Entities;
using EventPass.Domain.Enums;

namespace EventPass.Application.Services;

public partial class AuthenticationService
{
    public async Task<ApiResponse<LoginResponseDto>> GoogleLoginAsync(GoogleLoginRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
            return ApiResponse<LoginResponseDto>.Fail("Thiếu mã xác thực Google Token.");

        using var http = new HttpClient();
        string? email = null;
        string? googleId = null;
        string? name = null;
        string? picture = null;

        // 1. Thử xác thực theo dạng JWT id_token
        try
        {
            var googleIdTokenUrl = $"https://oauth2.googleapis.com/tokeninfo?id_token={request.IdToken}";
            var idTokenRes = await http.GetAsync(googleIdTokenUrl);
            if (idTokenRes.IsSuccessStatusCode)
            {
                var json = await idTokenRes.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
                googleId = root.TryGetProperty("sub", out var s) ? s.GetString() : null;
                name = root.TryGetProperty("name", out var n) ? n.GetString() : null;
                picture = root.TryGetProperty("picture", out var p) ? p.GetString() : null;
            }
        }
        catch
        {
            // Bỏ qua lỗi kết nối id_token
        }

        // 2. Nếu id_token không khớp (do là OAuth access_token), thử gọi userinfo endpoint
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
        {
            try
            {
                using var userReq = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
                userReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.IdToken);
                var userRes = await http.SendAsync(userReq);
                if (userRes.IsSuccessStatusCode)
                {
                    var json = await userRes.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;
                    email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
                    googleId = root.TryGetProperty("sub", out var s) ? s.GetString() : null;
                    name = root.TryGetProperty("name", out var n) ? n.GetString() : null;
                    picture = root.TryGetProperty("picture", out var p) ? p.GetString() : null;
                }
            }
            catch
            {
                // Bỏ qua lỗi kết nối userinfo
            }
        }

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
        {
            return ApiResponse<LoginResponseDto>.Fail("Google Token không hợp lệ hoặc đã hết hạn.");
        }

        var user = await _userRepository.GetByGoogleIdAsync(googleId)
                   ?? await _userRepository.GetByEmailAsync(email);

        if (user == null)
        {
            var baseUsername = email.Split('@')[0];
            var finalUsername = baseUsername;
            var counter = 1;
            while (!await _userRepository.IsUsernameUniqueAsync(finalUsername))
            {
                finalUsername = $"{baseUsername}{counter++}";
            }

            user = new User
            {
                Username = finalUsername,
                Email = email.ToLower(),
                FullName = string.IsNullOrWhiteSpace(name) ? "Google User" : name,
                GoogleId = googleId,
                AvatarUrl = picture,
                Role = UserRole.User
            };
            await _userRepository.AddAsync(user);
        }
        else if (string.IsNullOrEmpty(user.GoogleId))
        {
            user.GoogleId = googleId;
            if (string.IsNullOrEmpty(user.AvatarUrl) && !string.IsNullOrEmpty(picture))
                user.AvatarUrl = picture;
            await _userRepository.UpdateAsync(user);
        }

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
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
            AccessToken = accessToken,
            RefreshToken = refreshToken
        };

        return ApiResponse<LoginResponseDto>.Ok(response, "Đăng nhập Google thành công!");
    }
}

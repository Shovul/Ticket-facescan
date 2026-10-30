using System.Text.RegularExpressions;
using EventPass.Application.DTOs.Common;
using EventPass.Application.DTOs.User;
using EventPass.Application.Interfaces;
using Pgvector;

namespace EventPass.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAiServiceClient _aiServiceClient;

    public UserService(
        IUserRepository userRepository, 
        IPasswordHasher passwordHasher,
        IAiServiceClient aiServiceClient)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _aiServiceClient = aiServiceClient;
    }

    public async Task<ApiResponse<UserProfileResponseDto>> GetProfileAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return ApiResponse<UserProfileResponseDto>.Fail("Không tìm thấy người dùng.");

        var response = new UserProfileResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            PhoneNumber = user.Phone ?? string.Empty,
            Role = user.Role.ToString(),
            HasPassword = user.HasPassword
        };

        return ApiResponse<UserProfileResponseDto>.Ok(response);
    }

    public async Task<ApiResponse<UserProfileResponseDto>> UpdateProfileAsync(int userId, UpdateProfileRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return ApiResponse<UserProfileResponseDto>.Fail("Họ và tên không được để trống.");

        if (string.IsNullOrWhiteSpace(request.Email))
            return ApiResponse<UserProfileResponseDto>.Fail("Email không được để trống.");

        if (!Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            return ApiResponse<UserProfileResponseDto>.Fail("Địa chỉ email không đúng định dạng.");

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber) && !Regex.IsMatch(request.PhoneNumber, @"^(0[3|5|7|8|9])[0-9]{8}$"))
            return ApiResponse<UserProfileResponseDto>.Fail("Số điện thoại không hợp lệ (phải đủ 10 chữ số chuẩn Việt Nam).");

        var existingEmailUser = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLower());
        if (existingEmailUser != null && existingEmailUser.Id != userId)
            return ApiResponse<UserProfileResponseDto>.Fail("Email này đã được sử dụng bởi tài khoản khác.");

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return ApiResponse<UserProfileResponseDto>.Fail("Không tìm thấy người dùng.");

        user.FullName = request.FullName.Trim();
        user.Email = request.Email.Trim().ToLower();
        user.Phone = request.PhoneNumber?.Trim();

        await _userRepository.UpdateAsync(user);

        var response = new UserProfileResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            FullName = user.FullName,
            PhoneNumber = user.Phone ?? string.Empty,
            Role = user.Role.ToString(),
            HasPassword = user.HasPassword
        };

        return ApiResponse<UserProfileResponseDto>.Ok(response, "Cập nhật hồ sơ thành công!");
    }

    public async Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequestDto request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return ApiResponse<bool>.Fail("Không tìm thấy người dùng.");

        if (string.IsNullOrWhiteSpace(request.NewPassword) || string.IsNullOrWhiteSpace(request.ConfirmNewPassword))
            return ApiResponse<bool>.Fail("Vui lòng điền đầy đủ mật khẩu mới và xác nhận mật khẩu.");

        if (request.NewPassword != request.ConfirmNewPassword)
            return ApiResponse<bool>.Fail("Mật khẩu xác nhận không trùng khớp.");

        if (request.NewPassword.Length < 6)
            return ApiResponse<bool>.Fail("Mật khẩu mới phải từ 6 ký tự trở lên.");

        if (user.HasPassword)
        {
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                return ApiResponse<bool>.Fail("Vui lòng nhập mật khẩu hiện tại.");

            if (string.IsNullOrEmpty(user.PasswordHash) || !_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
                return ApiResponse<bool>.Fail("Mật khẩu hiện tại không chính xác.");

            if (request.NewPassword == request.CurrentPassword)
                return ApiResponse<bool>.Fail("Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.RefreshToken = null; // Huy phien cu
        await _userRepository.UpdateAsync(user);

        return ApiResponse<bool>.Ok(true, "Đổi mật khẩu thành công!");
    }

    public async Task<ApiResponse<FaceProfileResponseDto>> UpdateFaceProfileAsync(int userId, Stream imageStream, string fileName)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            return ApiResponse<FaceProfileResponseDto>.Fail("Không tìm thấy tài khoản người dùng.");

        // Goi AI Service trich xuat vector 512-d
        var aiResult = await _aiServiceClient.ExtractFaceEmbeddingAsync(imageStream, fileName, enforceDetection: true, antiSpoofing: true);

        if (!aiResult.Success || aiResult.Embedding == null || aiResult.Embedding.Count != 512)
        {
            return ApiResponse<FaceProfileResponseDto>.Fail(aiResult.ErrorMessage ?? "Không phát hiện khuôn mặt hợp lệ hoặc ảnh không đạt chuẩn.");
        }

        user.FaceVector = new Vector(aiResult.Embedding.ToArray());
        await _userRepository.UpdateAsync(user);

        return ApiResponse<FaceProfileResponseDto>.Ok(new FaceProfileResponseDto
        {
            Success = true,
            Message = "Nạp khuôn mặt Face ID thành công! Dữ liệu đã sẵn sàng.",
            AvatarUrl = user.AvatarUrl,
            FaceIdReady = true
        }, "Cập nhật Face ID thành công!");
    }
}


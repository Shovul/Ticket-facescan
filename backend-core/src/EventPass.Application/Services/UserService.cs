using System.Text.RegularExpressions;
using EventPass.Application.DTOs.Common;
using EventPass.Application.DTOs.User;
using EventPass.Application.Interfaces;
using Microsoft.Extensions.Logging;
using Pgvector;

namespace EventPass.Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAiServiceClient _aiServiceClient;
    private readonly IFileStorageService _fileStorageService;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository userRepository, 
        IPasswordHasher passwordHasher,
        IAiServiceClient aiServiceClient,
        IFileStorageService fileStorageService,
        ILogger<UserService> logger)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _aiServiceClient = aiServiceClient;
        _fileStorageService = fileStorageService;
        _logger = logger;
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
            HasPassword = user.HasPassword,
            AvatarUrl = user.AvatarUrl,
            HasFaceScan = user.FaceVector != null
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
            HasPassword = user.HasPassword,
            AvatarUrl = user.AvatarUrl,
            HasFaceScan = user.FaceVector != null
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

        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms);
        var imageBytes = ms.ToArray();

        // 1. Kiểm tra Magic Bytes nhị phân (chống giả mạo phần mở rộng file extension)
        if (!IsValidImageHeader(imageBytes))
        {
            return ApiResponse<FaceProfileResponseDto>.Fail("Tệp tải lên không phải là định dạng hình ảnh hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP).");
        }

        // 2. Gửi sang AI Microservice (chế độ Enrollment với ISO/ICAO quality, FIQA & MiniFASNet Liveness)
        using var aiStream = new MemoryStream(imageBytes);
        var aiResult = await _aiServiceClient.ExtractFaceEmbeddingAsync(
            aiStream, 
            fileName, 
            enforceDetection: true, 
            antiSpoofing: true, 
            isEnrollment: true);

        if (!aiResult.Success || aiResult.Embedding == null || aiResult.Embedding.Count != 512 ||
            aiResult.Embedding.Any(v => !float.IsFinite(v)) || aiResult.Embedding.All(v => v == 0))
        {
            return ApiResponse<FaceProfileResponseDto>.Fail(
                aiResult.ErrorMessage ?? "Không phát hiện khuôn mặt hợp lệ hoặc ảnh không đạt chuẩn ISO/ICAO.");
        }

        // 3. Tải ảnh chân dung định danh lên Dropbox Cloud
        string? avatarUrl = user.AvatarUrl;
        try
        {
            var ext = Path.GetExtension(fileName);
            if (string.IsNullOrEmpty(ext)) ext = ".jpg";
            var avatarFileName = $"user_{userId}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
            avatarUrl = await _fileStorageService.SaveBytesFileAsync(imageBytes, avatarFileName, "avatars");
            _logger.LogInformation("📸 [DROPBOX] Đã lưu avatar định danh cho user {UserId}: {Url}", userId, avatarUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Không thể tải ảnh avatar lên Dropbox cho user {UserId}: {Message}", userId, ex.Message);
        }

        // 4. Cập nhật vector 512-d và avatar_url vào cơ sở dữ liệu
        user.FaceVector = new Vector(aiResult.Embedding.ToArray());
        if (!string.IsNullOrEmpty(avatarUrl))
        {
            user.AvatarUrl = avatarUrl;
        }
        await _userRepository.UpdateAsync(user);

        return ApiResponse<FaceProfileResponseDto>.Ok(new FaceProfileResponseDto
        {
            Success = true,
            Message = "Nạp khuôn mặt Face ID thành công! Dữ liệu đã sẵn sàng.",
            AvatarUrl = user.AvatarUrl,
            FaceIdReady = true
        }, "Cập nhật Face ID thành công!");
    }

    /// <summary>
    /// Kiểm tra Magic Bytes nhị phân ở đầu tệp để bảo đảm là định dạng ảnh thực sự
    /// </summary>
    private static bool IsValidImageHeader(byte[] bytes)
    {
        if (bytes == null || bytes.Length < 4) return false;

        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return true;

        // PNG: 89 50 4E 47 (0x89 'P' 'N' 'G')
        if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) return true;

        // WEBP: RIFF .... WEBP
        if (bytes.Length >= 12 &&
            bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 && // RIFF
            bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50) // WEBP
            return true;

        return false;
    }
}

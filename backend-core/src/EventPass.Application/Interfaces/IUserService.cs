using EventPass.Application.DTOs.Common;
using EventPass.Application.DTOs.User;

namespace EventPass.Application.Interfaces;

public interface IUserService
{
    Task<ApiResponse<UserProfileResponseDto>> GetProfileAsync(int userId);
    Task<ApiResponse<UserProfileResponseDto>> UpdateProfileAsync(int userId, UpdateProfileRequestDto request);
    Task<ApiResponse<bool>> ChangePasswordAsync(int userId, ChangePasswordRequestDto request);
    Task<ApiResponse<FaceProfileResponseDto>> UpdateFaceProfileAsync(int userId, Stream imageStream, string fileName);
}

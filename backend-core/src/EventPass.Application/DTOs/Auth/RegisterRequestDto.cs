using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Auth;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống.")]
    [StringLength(50, MinimumLength = 4, ErrorMessage = "Tên đăng nhập từ 4 đến 50 ký tự.")]
    [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "Tên đăng nhập chỉ gồm chữ cái, số và dấu gạch dưới, không dấu.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email không được để trống.")]
    [EmailAddress(ErrorMessage = "Địa chỉ email không đúng định dạng.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ và tên không được để trống.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Họ và tên phải có độ dài từ 2 đến 100 ký tự.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Số điện thoại là bắt buộc.")]
    [RegularExpression(@"^(0[3|5|7|8|9])[0-9]{8}$", ErrorMessage = "Số điện thoại phải có 10 chữ số chuẩn định dạng Việt Nam.")]
    public string? PhoneNumber { get; set; }

    [Required(ErrorMessage = "Mật khẩu không được để trống.")]
    [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Xác nhận mật khẩu không được để trống.")]
    [Compare("Password", ErrorMessage = "Mật khẩu xác nhận không trùng khớp.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

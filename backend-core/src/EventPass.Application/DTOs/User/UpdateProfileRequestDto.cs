using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.User;

public class UpdateProfileRequestDto
{
    [Required(ErrorMessage = "Há» vÃ  tÃªn khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [StringLength(100, ErrorMessage = "Há» vÃ  tÃªn tá»‘i Ä‘a 100 kÃ½ tá»±.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [EmailAddress(ErrorMessage = "Äá»‹a chá»‰ email khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng.")]
    public string Email { get; set; } = string.Empty;

    [RegularExpression(@"^(0[3|5|7|8|9])[0-9]{8}$", ErrorMessage = "Sá»‘ Ä‘iá»‡n thoáº¡i pháº£i cÃ³ 10 chá»¯ sá»‘ chuáº©n Viá»‡t Nam.")]
    public string? PhoneNumber { get; set; }
}


using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Auth;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "TÃªn Ä‘Äƒng nháº­p khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "TÃªn Ä‘Äƒng nháº­p tá»« 3 Ä‘áº¿n 50 kÃ½ tá»±.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [EmailAddress(ErrorMessage = "Äá»‹a chá»‰ email khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Há» vÃ  tÃªn khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [StringLength(100, ErrorMessage = "Há» vÃ  tÃªn tá»‘i Ä‘a 100 kÃ½ tá»±.")]
    public string FullName { get; set; } = string.Empty;

    [RegularExpression(@"^(0[3|5|7|8|9])[0-9]{8}$", ErrorMessage = "Sá»‘ Ä‘iá»‡n thoáº¡i pháº£i cÃ³ 10 chá»¯ sá»‘ chuáº©n Viá»‡t Nam.")]
    public string? PhoneNumber { get; set; }

    [Required(ErrorMessage = "Máº­t kháº©u khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [MinLength(6, ErrorMessage = "Máº­t kháº©u tá»‘i thiá»ƒu 6 kÃ½ tá»±.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "XÃ¡c nháº­n máº­t kháº©u khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [Compare("Password", ErrorMessage = "Máº­t kháº©u xÃ¡c nháº­n khÃ´ng trÃ¹ng khá»›p.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}


using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Auth;

public class ResetPasswordRequestDto
{
    [Required(ErrorMessage = "Thiáº¿u mÃ£ xÃ¡c nháº­n Ä‘áº·t láº¡i máº­t kháº©u.")]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "Máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [MinLength(6, ErrorMessage = "Máº­t kháº©u má»›i pháº£i cÃ³ tá»‘i thiá»ƒu 6 kÃ½ tá»±.")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "XÃ¡c nháº­n máº­t kháº©u má»›i khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [Compare("NewPassword", ErrorMessage = "Máº­t kháº©u xÃ¡c nháº­n khÃ´ng trÃ¹ng khá»›p.")]
    public string ConfirmPassword { get; set; } = string.Empty;
}


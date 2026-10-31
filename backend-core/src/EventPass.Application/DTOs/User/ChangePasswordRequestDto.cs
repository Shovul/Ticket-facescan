using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.User;

public class ChangePasswordRequestDto
{
    [Required(ErrorMessage = "Vui lÃ²ng nháº­p máº­t kháº©u hiá»‡n táº¡i.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lÃ²ng nháº­p máº­t kháº©u má»›i.")]
    [MinLength(6, ErrorMessage = "Máº­t kháº©u má»›i pháº£i cÃ³ tá»‘i thiá»ƒu 6 kÃ½ tá»±.")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lÃ²ng xÃ¡c nháº­n máº­t kháº©u má»›i.")]
    [Compare("NewPassword", ErrorMessage = "Máº­t kháº©u xÃ¡c nháº­n khÃ´ng trÃ¹ng khá»›p.")]
    public string ConfirmNewPassword { get; set; } = string.Empty;
}


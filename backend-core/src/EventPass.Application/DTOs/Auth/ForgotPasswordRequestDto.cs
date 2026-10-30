using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Auth;

public class ForgotPasswordRequestDto
{
    [Required(ErrorMessage = "TÃªn Ä‘Äƒng nháº­p khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    [EmailAddress(ErrorMessage = "Äá»‹a chá»‰ email khÃ´ng Ä‘Ãºng Ä‘á»‹nh dáº¡ng.")]
    public string Email { get; set; } = string.Empty;
}


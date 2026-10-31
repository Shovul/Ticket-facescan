using System.ComponentModel.DataAnnotations;

namespace EventPass.Application.DTOs.Auth;

public class LoginRequestDto
{
    [Required(ErrorMessage = "TÃªn Ä‘Äƒng nháº­p khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Máº­t kháº©u khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng.")]
    public string Password { get; set; } = string.Empty;
}


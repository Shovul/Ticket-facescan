using System.Text.Json.Serialization;

namespace EventPass.Application.DTOs.Ai;

public class AiFaceExtractionResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("error_code")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("error_message")]
    public string? ErrorMessage { get; set; }

    [JsonPropertyName("embedding")]
    public List<float>? Embedding { get; set; }

    [JsonPropertyName("embedding_dim")]
    public int EmbeddingDim { get; set; }

    [JsonPropertyName("liveness")]
    public LivenessInfo? Liveness { get; set; }

    [JsonPropertyName("fiqa")]
    public FiqaInfo? Fiqa { get; set; }

    [JsonPropertyName("processing_time_ms")]
    public double ProcessingTimeMs { get; set; }
}

public class LivenessInfo
{
    [JsonPropertyName("is_real")]
    public bool IsReal { get; set; }

    [JsonPropertyName("score")]
    public double Score { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class FiqaInfo
{
    [JsonPropertyName("blur_score")]
    public double BlurScore { get; set; }

    [JsonPropertyName("is_blurry")]
    public bool IsBlurry { get; set; }

    [JsonPropertyName("brightness_score")]
    public double BrightnessScore { get; set; }

    [JsonPropertyName("is_too_dark")]
    public bool IsTooDark { get; set; }

    [JsonPropertyName("is_too_bright")]
    public bool IsTooBright { get; set; }

    [JsonPropertyName("face_width")]
    public int FaceWidth { get; set; }

    [JsonPropertyName("face_height")]
    public int FaceHeight { get; set; }

    [JsonPropertyName("is_too_small")]
    public bool IsTooSmall { get; set; }
}

using System.Net.Http.Headers;
using System.Text.Json;
using EventPass.Application.DTOs.Ai;
using EventPass.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EventPass.Infrastructure.ExternalServices;

public class AiServiceClient : IAiServiceClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AiServiceClient> _logger;
    private readonly string _apiKey;

    public AiServiceClient(HttpClient httpClient, IConfiguration configuration, ILogger<AiServiceClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var baseUrl = configuration["AiService:BaseUrl"] ?? "http://localhost:8000";
        _httpClient.BaseAddress = new Uri(baseUrl);
        _apiKey = configuration["AiService:ApiKey"] ?? "eventpass_internal_ai_token_2026";
    }

    public async Task<AiFaceExtractionResult> ExtractFaceEmbeddingAsync(
        Stream imageStream, 
        string fileName, 
        bool enforceDetection = true, 
        bool antiSpoofing = true, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var formData = new MultipartFormDataContent();
            
            var streamContent = new StreamContent(imageStream);
            streamContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            formData.Add(streamContent, "file", fileName);

            formData.Add(new StringContent(enforceDetection ? "true" : "false"), "enforce_detection");
            formData.Add(new StringContent(antiSpoofing ? "true" : "false"), "anti_spoofing");

            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/face/extract");
            request.Headers.Add("X-API-Key", _apiKey);
            request.Content = formData;

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var result = JsonSerializer.Deserialize<AiFaceExtractionResult>(json, options);
            if (result == null)
            {
                return new AiFaceExtractionResult
                {
                    Success = false,
                    ErrorCode = "AI_DESERIALIZATION_FAILED",
                    ErrorMessage = "Không thể đọc dữ liệu phản hồi từ AI Service."
                };
            }

            return result;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Lỗi kết nối tới AI Service (FastAPI): {Message}", ex.Message);
            return new AiFaceExtractionResult
            {
                Success = false,
                ErrorCode = "AI_SERVICE_UNAVAILABLE",
                ErrorMessage = $"Không thể kết nối đến AI Service tại {_httpClient.BaseAddress}."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Lỗi bất thường khi gọi AI Service: {Message}", ex.Message);
            return new AiFaceExtractionResult
            {
                Success = false,
                ErrorCode = "INTERNAL_ERROR",
                ErrorMessage = ex.Message
            };
        }
    }
}

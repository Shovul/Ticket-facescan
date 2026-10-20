using EventPass.Application.DTOs.Ai;

namespace EventPass.Application.Interfaces;

public interface IAiServiceClient
{
    Task<AiFaceExtractionResult> ExtractFaceEmbeddingAsync(
        Stream imageStream, 
        string fileName, 
        bool enforceDetection = true, 
        bool antiSpoofing = true, 
        CancellationToken cancellationToken = default);
}

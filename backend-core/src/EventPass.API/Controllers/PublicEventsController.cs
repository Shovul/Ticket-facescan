using EventPass.Application.DTOs.CustomerEvents;
using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventPass.API.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/public/events")]
public class PublicEventsController(IPublicEventRepository repository) : ControllerBase
{
    // Tra cứu danh sách sự kiện công khai, không trả dữ liệu quản trị hoặc sinh trắc học.
    [HttpGet]
    public Task<PublicEventPage> GetEvents([FromQuery] PublicEventQuery query, CancellationToken cancellationToken) =>
        repository.GetPageAsync(query, DateTime.UtcNow, cancellationToken);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PublicEventDto>> GetEvent(int id, CancellationToken cancellationToken)
    {
        if (id <= 0)
            return BadRequest(new { Message = "Mã sự kiện phải lớn hơn 0." });

        var result = await repository.GetDetailAsync(id, DateTime.UtcNow, cancellationToken);
        return result is null ? NotFound(new { Message = "Không tìm thấy sự kiện đang mở bán." }) : Ok(result);
    }
}

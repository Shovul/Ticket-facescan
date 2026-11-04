using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using FluentAssertions;
using EventPass.API.Controllers;
using EventPass.Application.Interfaces;
using EventPass.Application.DTOs.Events;
using EventPass.Domain.Entities;

namespace EventPass.API.Tests.Controllers;

public class EventsControllerTests
{
    private readonly Mock<IEventService> _mockEventService;
    private readonly Mock<ILogger<EventsController>> _mockLogger;
    private readonly EventsController _controller;

    public EventsControllerTests()
    {
        _mockEventService = new Mock<IEventService>();
        _mockLogger = new Mock<ILogger<EventsController>>();
        
        _controller = new EventsController(_mockEventService.Object, _mockLogger.Object);
        
        // Mock User Context for OrganizerId parsing
        var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1")
        }, "mock"));
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    [Fact]
    public async Task CreateEvent_ReturnsCreatedAtAction_WhenSuccessful()
    {
        // Arrange
        var dto = new CreateEventDto { Title = "Test Event" };
        var createdEvent = new Event { Id = 10, Title = "Test Event" };
        _mockEventService.Setup(s => s.CreateEventAsync(It.IsAny<CreateEventDto>()))
            .ReturnsAsync(createdEvent);

        // Act
        var result = await _controller.CreateEvent(dto);

        // Assert
        var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.ActionName.Should().Be(nameof(EventsController.GetEventById));
        createdResult.RouteValues.Should().NotBeNull();
        createdResult.RouteValues!["id"].Should().Be(10);
        dto.OrganizerId.Should().Be(1); 
    }

    [Fact]
    public async Task CreateEvent_ReturnsBadRequest_OnArgumentException()
    {
        // Arrange
        _mockEventService.Setup(s => s.CreateEventAsync(It.IsAny<CreateEventDto>()))
            .ThrowsAsync(new ArgumentException("Invalid date"));

        // Act
        var result = await _controller.CreateEvent(new CreateEventDto());

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().BeEquivalentTo(new { Error = "Invalid date" });
    }

    [Fact]
    public async Task UpdateEvent_ReturnsOk_WhenSuccessful()
    {
        // Arrange
        var dto = new CreateEventDto { Title = "Updated Event" };
        _mockEventService.Setup(s => s.UpdateEventAsync(1, dto))
            .ReturnsAsync(new Event { Id = 1, Title = "Updated Event" });

        // Act
        var result = await _controller.UpdateEvent(1, dto);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new { Message = "Cập nhật thông tin sự kiện thành công." });
    }

    [Fact]
    public async Task CancelEvent_ReturnsNotFound_WhenEventDoesNotExist()
    {
        // Arrange
        var request = new CancelEventRequest { Reason = "Weather", IsConfirmed = true };
        _mockEventService.Setup(s => s.CancelEventAsync(1, request.Reason, request.IsConfirmed))
            .ThrowsAsync(new KeyNotFoundException("Sự kiện không tồn tại"));

        // Act
        var result = await _controller.CancelEvent(1, request);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { Error = "Sự kiện không tồn tại" });
    }

    [Fact]
    public async Task RefreshKioskToken_ReturnsUnauthorized_OnInvalidPassword()
    {
        // Arrange
        var request = new RefreshKioskTokenRequest { AdminPassword = "wrong" };
        _mockEventService.Setup(s => s.RefreshKioskTokenAsync(5, request.AdminPassword))
            .ThrowsAsync(new UnauthorizedAccessException("Sai mật khẩu"));

        // Act
        var result = await _controller.RefreshKioskToken(5, request);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.Value.Should().BeEquivalentTo(new { Error = "Sai mật khẩu" });
    }

    [Fact]
    public async Task GetEvents_ReturnsOk_WithPaginatedData()
    {
        // Arrange
        var response = new PaginatedEventResponse { TotalCount = 1 };
        _mockEventService.Setup(s => s.GetEventsAsync(1, 10, "", "all")).ReturnsAsync(response);

        // Act
        var result = await _controller.GetEvents();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(response);
    }

    [Fact]
    public async Task GetEventById_ReturnsNotFound_WhenEventIsNull()
    {
        // Arrange
        _mockEventService.Setup(s => s.GetEventByIdAsync(99))
            .ReturnsAsync((Event)null!);

        // Act
        var result = await _controller.GetEventById(99);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeEquivalentTo(new { Error = "Không tìm thấy sự kiện." });
    }
}
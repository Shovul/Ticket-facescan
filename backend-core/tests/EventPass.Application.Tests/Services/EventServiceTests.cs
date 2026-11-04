using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using FluentAssertions;
using EventPass.Application.DTOs.Events;
using EventPass.Application.Interfaces;
using EventPass.Application.Services;
using EventPass.Domain.Entities;

namespace EventPass.Application.Tests.Services;

public class EventServiceTests
{
    private readonly Mock<IEventRepository> _mockEventRepo;
    private readonly Mock<IRepository<Ticket>> _mockTicketRepo;
    private readonly Mock<IRepository<TicketDetail>> _mockTicketDetailRepo;
    private readonly Mock<IUserRepository> _mockUserRepo;
    private readonly Mock<IFileStorageService> _mockFileStorageService;
    private readonly Mock<ILogger<EventService>> _mockLogger;
    private readonly EventService _service;

    public EventServiceTests()
    {
        _mockEventRepo = new Mock<IEventRepository>();
        _mockTicketRepo = new Mock<IRepository<Ticket>>();
        _mockTicketDetailRepo = new Mock<IRepository<TicketDetail>>();
        _mockUserRepo = new Mock<IUserRepository>();
        _mockFileStorageService = new Mock<IFileStorageService>();
        _mockLogger = new Mock<ILogger<EventService>>();

        _service = new EventService(
            _mockEventRepo.Object,
            _mockTicketRepo.Object,
            _mockTicketDetailRepo.Object,
            _mockUserRepo.Object,
            _mockFileStorageService.Object,
            _mockLogger.Object
        );
    }

    [Fact]
    public async Task CreateEventAsync_ValidDto_CreatesAndReturnsEvent()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var dto = new CreateEventDto 
        { 
            OrganizerId = 1,
            OrganizerName = "Ban Tổ Chức SGU",
            OrganizerEmail = "btc@sgu.edu.vn",
            OrganizerHotline = "02838354409",
            Title = "SGU TechDay 2026", 
            Description = "Mô tả sự kiện",
            Location = "Hội trường A",
            PublicTime = now,
            OpenTicketTime = now.AddHours(1),
            CloseTicketTime = now.AddDays(1),
            OpenKioskTime = now.AddDays(2),
            StartTime = now.AddDays(3),
            EndTime = now.AddDays(4),
            Tickets = new List<CreateTicketDto> { new CreateTicketDto { Name = "Vé VIP", Price = 100000, Quantity = 50 } },
            Kiosks = new List<CreateKioskDto> { new CreateKioskDto { Name = "Trạm 1", Location = "Cổng A" } }
        };

        _mockUserRepo.Setup(r => r.GetByIdAsync(dto.OrganizerId))
        .ReturnsAsync(new User { Id = dto.OrganizerId });
        _mockEventRepo.Setup(r => r.AddAsync(It.IsAny<Event>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.CreateEventAsync(dto);

        // Assert
        result.Should().NotBeNull();
        result.Title.Should().Be("SGU TechDay 2026");
        _mockEventRepo.Verify(r => r.AddAsync(It.IsAny<Event>()), Times.Once);
    }

    [Fact]
    public async Task GetEventByIdAsync_ExistingId_ReturnsEventWithDetails()
    {
        // Arrange
        var existingEvent = new Event 
        { 
            Id = 10, 
            Title = "SGU TechDay 2026",
            Location = "Main Hall" 
        };

        _mockEventRepo.Setup(r => r.GetEventWithDetailsAsync(10))
            .ReturnsAsync(existingEvent);

        // Act
        var result = await _service.GetEventByIdAsync(10);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(10);
        result.Title.Should().Be("SGU TechDay 2026");
    }

    [Fact]
    public async Task GetEventByIdAsync_NonExistingId_ThrowsKeyNotFoundException()
    {
        // Arrange
        _mockEventRepo.Setup(r => r.GetEventWithDetailsAsync(99))
            .ReturnsAsync((Event?)null);

        // Act
        Func<Task> act = async () => await _service.GetEventByIdAsync(99);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>()
            .WithMessage("Không tìm thấy sự kiện.");
    }

    [Fact]
    public async Task CancelEventAsync_ExistingEvent_UpdatesStatusToCancelled()
    {
        // Arrange
        var existingEvent = new Event { Id = 1, Title = "Active Event" };
        _mockEventRepo.Setup(r => r.GetByIdAsync(1))
            .ReturnsAsync(existingEvent);
        _mockEventRepo.Setup(r => r.UpdateAsync(It.IsAny<Event>()))
            .Returns(Task.CompletedTask);
        _mockTicketDetailRepo.Setup(r => r.GetPagedAsync(1, 10000, It.IsAny<System.Linq.Expressions.Expression<Func<TicketDetail, bool>>>(), null, ""))
            .ReturnsAsync((new List<TicketDetail>(), 0));

        // Act
        await _service.CancelEventAsync(1, "Hủy do điều kiện thời tiết xấu", true);

        // Assert
        _mockEventRepo.Verify(r => r.UpdateAsync(It.Is<Event>(e => e.Id == 1)), Times.Once);
    }

    [Fact]
    public async Task CancelEventAsync_NonExistingEvent_ThrowsKeyNotFoundException()
    {
        // Arrange
        _mockEventRepo.Setup(r => r.GetByIdAsync(99))
            .ReturnsAsync((Event?)null);

        // Act
        Func<Task> act = async () => await _service.CancelEventAsync(99, "Lý do hủy sự kiện hợp lệ dài hơn 10 ký tự", true);

        // Assert
        await act.Should().ThrowAsync<KeyNotFoundException>();
    }
}
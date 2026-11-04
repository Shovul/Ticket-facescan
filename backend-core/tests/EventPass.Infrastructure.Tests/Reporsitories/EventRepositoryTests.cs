using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using EventPass.Infrastructure.Repositories;

namespace EventPass.Infrastructure.Tests.Repositories;

public class EventRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly EventRepository _repository;

    public EventRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new AppDbContext(options);
        _repository = new EventRepository(_context);
    }

    [Fact]
    public async Task GetEventWithDetailsAsync_IncludesTicketsAndKiosks()
    {
        // Arrange
        var testEvent = new Event 
        { 
            Title = "Tech Conf",
            Tickets = new List<Ticket> { new Ticket { Name = "VIP" } },
            Kiosks = new List<Kiosk> { new Kiosk { Name = "Gate A" } }
        };
        _context.Set<Event>().Add(testEvent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.GetEventWithDetailsAsync(testEvent.Id);

        // Assert
        result.Should().NotBeNull();
        result.Tickets.Should().HaveCount(1); // Validates Include(e => e.Tickets)[cite: 6]
        result.Kiosks.Should().HaveCount(1);  // Validates Include(e => e.Kiosks)[cite: 6]
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
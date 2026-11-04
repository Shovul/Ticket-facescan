using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using EventPass.Infrastructure.Repositories;

namespace EventPass.Infrastructure.Tests.Repositories;

public class TicketRepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly TicketRepository _repository;

    public TicketRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new AppDbContext(options);
        _repository = new TicketRepository(_context);
    }

    [Fact]
    public async Task GetTicketsByEventIdAsync_ReturnsOnlyActiveTicketsForEvent()
    {
        // Arrange
        var eventId = 100;
        _context.Set<Ticket>().AddRange(
            new Ticket { EventId = eventId, Name = "Active1", IsDeleted = false },
            new Ticket { EventId = eventId, Name = "Deleted", IsDeleted = true },
            new Ticket { EventId = 999, Name = "OtherEvent", IsDeleted = false }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.GetTicketsByEventIdAsync(eventId);

        // Assert
        result.Should().HaveCount(1);
        result.First().Name.Should().Be("Active1"); // Validates WHERE EventId == id && !IsDeleted[cite: 8]
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
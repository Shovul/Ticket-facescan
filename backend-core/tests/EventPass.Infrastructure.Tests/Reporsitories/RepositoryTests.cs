using Microsoft.EntityFrameworkCore;
using Xunit;
using FluentAssertions;
using EventPass.Domain.Entities;
using EventPass.Infrastructure.Persistence;
using EventPass.Infrastructure.Repositories;

namespace EventPass.Infrastructure.Tests.Repositories;

public class RepositoryTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Repository<Event> _repository; 

    public RepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
            
        _context = new AppDbContext(options);
        _repository = new Repository<Event>(_context);
    }

    [Fact]
    public async Task AddAsync_AddsEntityAndSetsCreatedAt()
    {
        // Arrange
        var newEvent = new Event { Title = "Test Event" };

        // Act
        await _repository.AddAsync(newEvent);

        // Assert
        var savedEvent = await _context.Set<Event>().FirstOrDefaultAsync();
        savedEvent.Should().NotBeNull();
        savedEvent.Title.Should().Be("Test Event");
        savedEvent.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1)); // Validates automatic CreatedAt assignment[cite: 7]
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsEntity_WhenNotDeleted()
    {
        // Arrange
        var testEvent = new Event { Title = "Active Event", IsDeleted = false };
        _context.Set<Event>().Add(testEvent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.GetByIdAsync(testEvent.Id);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(testEvent.Id);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenSoftDeleted()
    {
        // Arrange
        var testEvent = new Event { Title = "Deleted Event", IsDeleted = true };
        _context.Set<Event>().Add(testEvent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.GetByIdAsync(testEvent.Id);

        // Assert
        result.Should().BeNull(); // Filters out IsDeleted == true[cite: 7]
    }

    [Fact]
    public async Task SoftDeleteAsync_SetsIsDeletedAndDeletedAt()
    {
        // Arrange
        var testEvent = new Event { Title = "To Delete" };
        _context.Set<Event>().Add(testEvent);
        await _context.SaveChangesAsync();

        // Act
        await _repository.SoftDeleteAsync(testEvent);
        await _repository.SaveChangesAsync();

        // Assert
        testEvent.IsDeleted.Should().BeTrue(); // Confirms soft delete logic[cite: 7]
        testEvent.DeletedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task GetPagedAsync_AppliesPaginationAndFiltersDeleted()
    {
        // Arrange
        _context.Set<Event>().AddRange(
            new Event { Title = "E1", IsDeleted = false },
            new Event { Title = "E2", IsDeleted = false },
            new Event { Title = "E3", IsDeleted = true }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _repository.GetPagedAsync(pageNumber: 1, pageSize: 1);

        // Assert
        result.TotalCount.Should().Be(2); // Skips deleted items[cite: 7]
        result.Items.Should().HaveCount(1);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
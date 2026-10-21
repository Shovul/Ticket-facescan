using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;
using EventPass.Domain.Entities;

namespace EventPass.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<TicketDetail> TicketDetails => Set<TicketDetail>();
    public DbSet<CheckinLog> CheckinLogs => Set<CheckinLog>();
    public DbSet<Kiosk> Kiosks => Set<Kiosk>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Kích hoạt extension pgvector
        modelBuilder.HasPostgresExtension("vector");

        // Global Query Filters to automatically ignore soft-deleted records
        modelBuilder.Entity<User>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Event>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Ticket>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Order>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<TicketDetail>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Kiosk>().HasQueryFilter(e => !e.IsDeleted);

        // Cấu hình cột vector(512)
        modelBuilder.Entity<TicketDetail>()
            .Property(td => td.FaceVector)
            .HasColumnType("vector(512)");

        modelBuilder.Entity<User>()
            .Property(u => u.FaceVector)
            .HasColumnType("vector(512)");

        // JSON Converter cho ICollection<string> (hỗ trợ null từ DB)
        var stringListConverter = new ValueConverter<ICollection<string>?, string?>(
            v => v == null ? null : JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => string.IsNullOrWhiteSpace(v) 
                ? new List<string>() 
                : JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>()
        );

        var stringListComparer = new ValueComparer<ICollection<string>?>(
            (c1, c2) => (c1 == null && c2 == null) || (c1 != null && c2 != null && c1.SequenceEqual(c2)),
            c => c == null ? 0 : c.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
            c => c == null ? new List<string>() : c.ToList()
        );

        // Apply converter to Event Image URLs list
        modelBuilder.Entity<Event>()
            .Property(e => e.EventImages)
            .HasConversion(stringListConverter)
            .Metadata.SetValueComparer(stringListComparer);

        // Apply converter to TicketDetail Face Image URLs list
        modelBuilder.Entity<TicketDetail>()
            .Property(td => td.TicketImages)
            .HasConversion(stringListConverter)
            .Metadata.SetValueComparer(stringListComparer);

        // Configure CheckinLog
        modelBuilder.Entity<CheckinLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.TicketDetail)
                .WithMany()
                .HasForeignKey(e => e.TicketDetailId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Event)
                .WithMany()
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Kiosk
        modelBuilder.Entity<Kiosk>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Event)
                .WithMany(e => e.Kiosks)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.SecretToken).IsUnique();
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Automatically set CreatedAt and UpdatedAt timestamps
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}

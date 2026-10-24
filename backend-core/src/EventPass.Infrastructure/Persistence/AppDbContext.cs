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
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        LegacySchemaConfiguration.Configure(modelBuilder);
        modelBuilder.Entity<Ticket>().Property(t => t.IsActive).HasDefaultValue(true);
        modelBuilder.Entity<Order>(entity =>
        {
            entity.Property(o => o.ReservationStatus).HasMaxLength(30);
            entity.Property(o => o.RequestKey).HasMaxLength(64);
            entity.Property(o => o.PaymentReference).HasMaxLength(100);
            entity.HasIndex(o => new { o.UserId, o.RequestKey }).IsUnique();
            entity.HasIndex(o => o.PaymentReference).IsUnique();
            entity.HasIndex(o => new { o.ReservationStatus, o.ExpiresAt });
        });
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasQueryFilter(i => !i.IsDeleted);
            entity.Property(i => i.UnitPrice).HasPrecision(18, 2);
            entity.Property(i => i.Status).HasMaxLength(30);
            entity.Property(i => i.AttendeeName).HasMaxLength(100);
            entity.Property(i => i.AttendeeEmail).HasMaxLength(255);
            entity.Property(i => i.AttendeePhone).HasMaxLength(15);
            entity.Property(i => i.FaceVector).HasColumnType("vector(512)");
            entity.HasOne(i => i.Order).WithMany(o => o.Items).HasForeignKey(i => i.OrderId);
            entity.HasOne(i => i.Ticket).WithMany().HasForeignKey(i => i.TicketId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(i => i.TicketDetail).WithMany().HasForeignKey(i => i.TicketDetailId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(i => i.TicketDetailId).IsUnique();
            entity.HasIndex(i => new { i.TicketId, i.Status });
        });

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

using EventPass.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EventPass.Infrastructure.Persistence;

internal static class LegacySchemaConfiguration
{
    // Giữ tên cột của database SQL cũ để không làm mất dữ liệu khi chuyển sang EF.
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.Property(x => x.Email).HasMaxLength(255);
            e.Property(x => x.PasswordHash).HasMaxLength(255);
            e.Property(x => x.FullName).HasMaxLength(255);
            e.Property(x => x.Phone).HasMaxLength(50);
            e.HasIndex(x => x.Email).IsUnique();
        });
        modelBuilder.Entity<Event>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(255);
            e.Property(x => x.Location).HasMaxLength(255);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.OrganizerId).OnDelete(DeleteBehavior.Cascade);
        });
        modelBuilder.Entity<Ticket>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(255);
            e.Property(x => x.Price).HasPrecision(18, 2);
        });
        modelBuilder.Entity<Order>(e =>
        {
            e.Property(x => x.TotalAmount).HasPrecision(18, 2);
            e.Property(x => x.PaymentStatus).HasColumnName("status");
            e.Property(x => x.TransactionCode).HasColumnName("transaction_id").HasMaxLength(100);
            e.Property(x => x.PaymentMethod).HasMaxLength(50).IsRequired(false);
            e.Property(x => x.OrderCode).HasMaxLength(100);
            e.HasIndex(x => x.OrderCode).IsUnique();
        });
        modelBuilder.Entity<TicketDetail>(e =>
        {
            e.Property(x => x.TicketCode).HasMaxLength(100);
            e.Property(x => x.AttendeeName).HasMaxLength(255);
            e.Property(x => x.AttendeeEmail).HasMaxLength(255);
            e.Property(x => x.AttendeePhone).HasMaxLength(50);
            e.Property(x => x.QrCodeUrl).IsRequired(false);
            e.HasIndex(x => x.TicketCode).IsUnique();
            e.HasIndex(x => new { x.EventId, x.Status }).HasDatabaseName("idx_ticket_details_event");
            e.HasIndex(x => x.FaceVector).HasDatabaseName("idx_ticket_details_face_vector")
                .HasMethod("hnsw").HasOperators("vector_cosine_ops")
                .HasStorageParameter("m", 16).HasStorageParameter("ef_construction", 64);
        });
        modelBuilder.Entity<User>().HasIndex(x => x.FaceVector).HasDatabaseName("idx_users_face_vector")
            .HasMethod("hnsw").HasOperators("vector_cosine_ops")
            .HasStorageParameter("m", 16).HasStorageParameter("ef_construction", 64);
        modelBuilder.Entity<CheckinLog>(e =>
        {
            e.Property(x => x.KioskName).HasMaxLength(100).IsRequired(false);
            e.Property(x => x.Status).HasMaxLength(50);
            e.Property(x => x.CapturedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });
    }
}

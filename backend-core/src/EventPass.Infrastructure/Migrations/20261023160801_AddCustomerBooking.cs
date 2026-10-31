using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using Pgvector;

#nullable disable

namespace EventPass.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_orders_user_id",
                table: "orders");

            migrationBuilder.AddColumn<bool>(
                name: "is_active",
                table: "tickets",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "confirmation_email_sent_at",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "expires_at",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "paid_at",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "payment_expires_at",
                table: "orders",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "payment_reference",
                table: "orders",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "request_key",
                table: "orders",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "reservation_status",
                table: "orders",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "order_items",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    order_id = table.Column<int>(type: "integer", nullable: false),
                    ticket_id = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    attendee_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    attendee_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    attendee_phone = table.Column<string>(type: "character varying(15)", maxLength: 15, nullable: true),
                    face_vector = table.Column<Vector>(type: "vector(512)", nullable: true),
                    protected_face_image = table.Column<byte[]>(type: "bytea", nullable: true),
                    face_image_content_type = table.Column<string>(type: "text", nullable: true),
                    face_consent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ticket_detail_id = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_order_items", x => x.id);
                    table.ForeignKey(
                        name: "fk_order_items_orders_order_id",
                        column: x => x.order_id,
                        principalTable: "orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_order_items_ticket_details_ticket_detail_id",
                        column: x => x.ticket_detail_id,
                        principalTable: "ticket_details",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_order_items_tickets_ticket_id",
                        column: x => x.ticket_id,
                        principalTable: "tickets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_orders_payment_reference",
                table: "orders",
                column: "payment_reference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_orders_reservation_status_expires_at",
                table: "orders",
                columns: new[] { "reservation_status", "expires_at" });

            migrationBuilder.CreateIndex(
                name: "ix_orders_user_id_request_key",
                table: "orders",
                columns: new[] { "user_id", "request_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_order_items_order_id",
                table: "order_items",
                column: "order_id");

            migrationBuilder.CreateIndex(
                name: "ix_order_items_ticket_detail_id",
                table: "order_items",
                column: "ticket_detail_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_order_items_ticket_id_status",
                table: "order_items",
                columns: new[] { "ticket_id", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "order_items");

            migrationBuilder.DropIndex(
                name: "ix_orders_payment_reference",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_reservation_status_expires_at",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "ix_orders_user_id_request_key",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "is_active",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "confirmation_email_sent_at",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "expires_at",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "paid_at",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "payment_expires_at",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "payment_reference",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "request_key",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "reservation_status",
                table: "orders");

            migrationBuilder.CreateIndex(
                name: "ix_orders_user_id",
                table: "orders",
                column: "user_id");
        }
    }
}

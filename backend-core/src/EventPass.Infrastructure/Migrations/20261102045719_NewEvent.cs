using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPass.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class NewEvent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "tickets",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "email_checkin_note",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "email_subject",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "event_speakers",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "open_kiosk_time",
                table: "events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "organizer_email",
                table: "events",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "organizer_hotline",
                table: "events",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "organizer_legal_id",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "organizer_logo",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "organizer_name",
                table: "events",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "organizer_website",
                table: "events",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                table: "tickets");

            migrationBuilder.DropColumn(
                name: "email_checkin_note",
                table: "events");

            migrationBuilder.DropColumn(
                name: "email_subject",
                table: "events");

            migrationBuilder.DropColumn(
                name: "event_speakers",
                table: "events");

            migrationBuilder.DropColumn(
                name: "open_kiosk_time",
                table: "events");

            migrationBuilder.DropColumn(
                name: "organizer_email",
                table: "events");

            migrationBuilder.DropColumn(
                name: "organizer_hotline",
                table: "events");

            migrationBuilder.DropColumn(
                name: "organizer_legal_id",
                table: "events");

            migrationBuilder.DropColumn(
                name: "organizer_logo",
                table: "events");

            migrationBuilder.DropColumn(
                name: "organizer_name",
                table: "events");

            migrationBuilder.DropColumn(
                name: "organizer_website",
                table: "events");
        }
    }
}

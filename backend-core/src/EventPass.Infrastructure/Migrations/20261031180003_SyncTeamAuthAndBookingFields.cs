using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPass.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SyncTeamAuthAndBookingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255);

            migrationBuilder.AddColumn<string>(
                name: "google_id",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "password_reset_token",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "refresh_token",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "refresh_token_expiry_time",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "reset_token_expires",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "username",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "google_id",
                table: "users");

            migrationBuilder.DropColumn(
                name: "password_reset_token",
                table: "users");

            migrationBuilder.DropColumn(
                name: "refresh_token",
                table: "users");

            migrationBuilder.DropColumn(
                name: "refresh_token_expiry_time",
                table: "users");

            migrationBuilder.DropColumn(
                name: "reset_token_expires",
                table: "users");

            migrationBuilder.DropColumn(
                name: "username",
                table: "users");

            migrationBuilder.AlterColumn<string>(
                name: "password_hash",
                table: "users",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(255)",
                oldMaxLength: 255,
                oldNullable: true);
        }
    }
}

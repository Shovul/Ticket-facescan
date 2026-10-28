using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventPass.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketClaimLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "claim_token_hash",
                table: "order_items",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_order_items_claim_token_hash",
                table: "order_items",
                column: "claim_token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_order_items_claim_token_hash",
                table: "order_items");

            migrationBuilder.DropColumn(
                name: "claim_token_hash",
                table: "order_items");
        }
    }
}

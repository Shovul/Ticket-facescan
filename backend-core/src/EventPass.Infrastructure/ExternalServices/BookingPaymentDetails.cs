using EventPass.Application.DTOs.Bookings;
using EventPass.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace EventPass.Infrastructure.ExternalServices;

public class BookingPaymentDetails(IConfiguration configuration) : IBookingPaymentDetails
{
    private string Bank => configuration["BookingPayment:BankCode"] ?? "";
    private string Account => configuration["BookingPayment:AccountNumber"] ?? "";
    private string Name => configuration["BookingPayment:AccountName"] ?? "";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Bank) && !string.IsNullOrWhiteSpace(Account) && !string.IsNullOrWhiteSpace(Name);
    public BookingPaymentDto Create(string code, decimal amount) => new(Bank, Account, Name, code, amount,
        $"https://img.vietqr.io/image/{Uri.EscapeDataString(Bank)}-{Uri.EscapeDataString(Account)}-compact2.png?amount={amount.ToString("0", System.Globalization.CultureInfo.InvariantCulture)}&addInfo={Uri.EscapeDataString(code)}&accountName={Uri.EscapeDataString(Name)}");
}

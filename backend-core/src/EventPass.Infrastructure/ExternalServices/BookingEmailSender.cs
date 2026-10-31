using System.Net;
using System.Net.Mail;
using EventPass.Application.DTOs.Bookings;
using EventPass.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace EventPass.Infrastructure.ExternalServices;

public class BookingEmailSender(IConfiguration configuration, ILogger<BookingEmailSender> logger) : IBookingEmailSender
{
    // Lỗi gửi thư không làm mất hiệu lực của vé đã phát hành.
    public async Task<bool> SendAsync(BookingEmail message, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(configuration["BookingMail:Host"]) || string.IsNullOrWhiteSpace(configuration["BookingMail:From"]))
        {
            logger.LogInformation("Chưa cấu hình gửi email cho đơn {OrderCode}.", message.OrderCode);
            return false;
        }
        try
        {
            using var client = new SmtpClient(configuration["BookingMail:Host"], configuration.GetValue("BookingMail:Port", 587))
            {
                EnableSsl = configuration.GetValue("BookingMail:EnableSsl", true),
                Credentials = new NetworkCredential(configuration["BookingMail:Username"], configuration["BookingMail:Password"])
            };
            using var mail = new MailMessage(configuration["BookingMail:From"]!, message.Recipient)
            {
                Subject = $"Vé sự kiện {message.EventTitle}",
                Body = $"{message.EventTitle}\n{message.StartTime:O}\n{message.Location}\nĐơn: {message.OrderCode}\n\n"
                    + string.Join("\n\n", message.Tickets.Select(t => $"{t.TicketTypeName}\n{t.AttendeeName}\nMã vé: {t.TicketCode}\nQR dự phòng: {t.QrCodeUrl}"))
                    + "\n\nVui lòng hoàn tất Face ID trước khi vào làn nhận diện. Khi cần đối soát, xuất trình mã vé tại quầy hỗ trợ.",
                BodyEncoding = System.Text.Encoding.UTF8, SubjectEncoding = System.Text.Encoding.UTF8
            };
            await client.SendMailAsync(mail, ct);
            return true;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Không gửi được email đơn {OrderCode}.", message.OrderCode);
            return false;
        }
    }
}

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using EventPass.Application.Interfaces;

namespace EventPass.Application.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var smtpServer = _configuration["EmailSettings:Server"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_configuration["EmailSettings:Port"] ?? "587");
        var senderEmail = _configuration["EmailSettings:SenderEmail"] ?? "support@eventpass.vn";
        var senderPassword = _configuration["EmailSettings:SenderPassword"] ?? string.Empty;

        if (string.IsNullOrEmpty(senderPassword))
        {
            // Neu chua cau hinh SMTP pass, khong throw exception lam chet luong
            return;
        }

        using var client = new SmtpClient(smtpServer, smtpPort)
        {
            Credentials = new NetworkCredential(senderEmail, senderPassword),
            EnableSsl = true
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(senderEmail, "EventPass Support"),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };

        mailMessage.To.Add(toEmail);

        await client.SendMailAsync(mailMessage);
    }
}

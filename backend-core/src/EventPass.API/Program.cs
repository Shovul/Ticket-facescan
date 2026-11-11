using EventPass.API.Hubs;
using EventPass.API.Services;
using EventPass.Application.Interfaces;
using EventPass.Application.Services;
using EventPass.Infrastructure.ExternalServices;
using EventPass.Infrastructure.Persistence;
using EventPass.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using EventPass.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using EventPass.Infrastructure.Storage;
using Microsoft.OpenApi.Models;

// ==============================================================================
// 0. Tự động nạp file .env từ thư mục gốc nếu có (Local Dev & Docker fallback)
// ==============================================================================
static void LoadDotEnv()
{
    var current = Directory.GetCurrentDirectory();
    string? envPath = null;
    var dir = new DirectoryInfo(current);
    while (dir != null)
    {
        var candidate = Path.Combine(dir.FullName, ".env");
        if (File.Exists(candidate))
        {
            envPath = candidate;
            break;
        }
        dir = dir.Parent;
    }

    if (envPath != null && File.Exists(envPath))
    {
        foreach (var rawLine in File.ReadAllLines(envPath))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrEmpty(line) || line.StartsWith('#') || !line.Contains('='))
                continue;

            var parts = line.Split('=', 2);
            var key = parts[0].Trim();
            var val = parts[1].Trim();
            if (val.Length >= 2 && ((val.StartsWith('"') && val.EndsWith('"')) || (val.StartsWith('\'') && val.EndsWith('\''))))
            {
                val = val[1..^1];
            }

            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, val);
            }
        }
    }
}
LoadDotEnv();

var seedOnly = args.Any(a => a.Equals("--seed", StringComparison.OrdinalIgnoreCase));
var builder = WebApplication.CreateBuilder(args.Where(a => !a.Equals("--seed", StringComparison.OrdinalIgnoreCase)).ToArray());

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();
// Cho phép nạp thêm biến môi trường hệ thống
builder.Configuration.AddEnvironmentVariables();

// ==============================================================================
// Tự động map cấu hình từ Biến Môi Trường (.env) vào Configuration
// ==============================================================================
// 1. Connection String Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    var dbHost = builder.Configuration["DB_HOST"] ?? "localhost";
    var dbPort = builder.Configuration["DB_PORT"] ?? "5433";
    var dbName = builder.Configuration["DB_NAME"] ?? "eventpass_db";
    var dbUser = builder.Configuration["DB_USER"] ?? "postgres";
    var dbPass = builder.Configuration["DB_PASSWORD"] ?? "your_password";
    connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPass};";
}

if (!string.IsNullOrEmpty(connectionString) && connectionString.StartsWith("postgres"))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    var port = uri.Port > 0 ? uri.Port : 5432;
    connectionString = $"Host={uri.Host};Port={port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true;";
}

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseVector();
    });
    options.UseSnakeCaseNamingConvention();
});
builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<AppDbContext>());

// 2. Map PayOS Gateway
if (string.IsNullOrWhiteSpace(builder.Configuration["PayOS:ClientId"]) && !string.IsNullOrWhiteSpace(builder.Configuration["PAYOS_CLIENT_ID"]))
{
    builder.Configuration["PayOS:ClientId"] = builder.Configuration["PAYOS_CLIENT_ID"]!;
    builder.Configuration["PayOS:ApiKey"] = builder.Configuration["PAYOS_API_KEY"] ?? "";
    builder.Configuration["PayOS:ChecksumKey"] = builder.Configuration["PAYOS_CHECKSUM_KEY"] ?? "";
    builder.Configuration["PayOS:ReturnUrl"] = builder.Configuration["PAYOS_RETURN_URL"] ?? "http://localhost:3000/my-tickets";
    builder.Configuration["PayOS:CancelUrl"] = builder.Configuration["PAYOS_CANCEL_URL"] ?? "http://localhost:3000/checkout";
}

// 3. Map Dropbox Storage
if (string.IsNullOrWhiteSpace(builder.Configuration["Dropbox:AppKey"]) && !string.IsNullOrWhiteSpace(builder.Configuration["DROPBOX_APP_KEY"]))
{
    builder.Configuration["Dropbox:AppKey"] = builder.Configuration["DROPBOX_APP_KEY"]!;
    builder.Configuration["Dropbox:AppSecret"] = builder.Configuration["DROPBOX_APP_SECRET"] ?? "";
    builder.Configuration["Dropbox:RefreshToken"] = builder.Configuration["DROPBOX_REFRESH_TOKEN"] ?? "";
    builder.Configuration["Dropbox:FolderPath"] = builder.Configuration["DROPBOX_FOLDER_PATH"] ?? "/EventPass";
}

// 4. Map Booking Payment & Mail Notification
if (string.IsNullOrWhiteSpace(builder.Configuration["BookingPayment:AccountNumber"]) && !string.IsNullOrWhiteSpace(builder.Configuration["BOOKING_ACCOUNT_NUMBER"]))
{
    builder.Configuration["BookingPayment:BankCode"] = builder.Configuration["BOOKING_BANK_CODE"] ?? "MBBank";
    builder.Configuration["BookingPayment:AccountNumber"] = builder.Configuration["BOOKING_ACCOUNT_NUMBER"]!;
    builder.Configuration["BookingPayment:AccountName"] = builder.Configuration["BOOKING_ACCOUNT_NAME"] ?? "EVENTPASS PAYMENT";
}

var mailPass = builder.Configuration["BookingMail:Password"] ?? builder.Configuration["BOOKING_MAIL_PASSWORD"] ?? builder.Configuration["EmailSettings:SenderPassword"] ?? builder.Configuration["EMAIL_PASSWORD"];
var mailUser = builder.Configuration["BookingMail:Username"] ?? builder.Configuration["BOOKING_MAIL_USERNAME"] ?? builder.Configuration["EmailSettings:SenderEmail"] ?? builder.Configuration["EMAIL_SENDER"];
var mailFrom = builder.Configuration["BookingMail:From"] ?? builder.Configuration["BOOKING_MAIL_FROM"] ?? mailUser;
var mailHost = builder.Configuration["BookingMail:Host"] ?? builder.Configuration["BOOKING_MAIL_HOST"] ?? builder.Configuration["EmailSettings:Server"] ?? builder.Configuration["EMAIL_SERVER"] ?? "smtp.gmail.com";
var mailPort = builder.Configuration["BookingMail:Port"] ?? builder.Configuration["BOOKING_MAIL_PORT"] ?? builder.Configuration["EmailSettings:Port"] ?? builder.Configuration["EMAIL_PORT"] ?? "587";

if (!string.IsNullOrEmpty(mailPass))
{
    builder.Configuration["BookingMail:Password"] = mailPass;
    builder.Configuration["BookingMail:Username"] = mailUser ?? "";
    builder.Configuration["BookingMail:From"] = mailFrom ?? "";
    builder.Configuration["BookingMail:Host"] = mailHost;
    builder.Configuration["BookingMail:Port"] = mailPort;

    builder.Configuration["EmailSettings:SenderPassword"] = mailPass;
    builder.Configuration["EmailSettings:SenderEmail"] = mailUser ?? "";
    builder.Configuration["EmailSettings:Server"] = mailHost;
    builder.Configuration["EmailSettings:Port"] = mailPort;
}

// 5. Cấu hình CORS phục vụ Frontend Next.js và Kiosk Native App
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 6. Đăng ký HttpClient cho FastAPI AI Service
builder.Services.AddHttpClient<IAiServiceClient, AiServiceClient>();

// 7. Đăng ký Repositories (Data Access Layer)
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITicketDetailRepository, TicketDetailRepository>();
builder.Services.AddScoped<ICheckinLogRepository, CheckinLogRepository>();
builder.Services.AddScoped<IKioskRepository, KioskRepository>();
builder.Services.AddScoped<IPublicEventRepository, PublicEventRepository>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<IBookingService>(sp => sp.GetRequiredService<BookingService>());
builder.Services.AddScoped<IBookingPaymentReceiver>(sp => sp.GetRequiredService<BookingService>());
builder.Services.AddScoped<IBookingPaymentDetails, BookingPaymentDetails>();
builder.Services.AddScoped<IBookingFaceImageProtector, BookingFaceImageProtector>();
builder.Services.AddScoped<IBookingEmailSender, BookingEmailSender>();
builder.Services.AddDataProtection();
builder.Services.AddHostedService<BookingExpirationWorker>();

// Scheme riêng cho đặt vé
builder.Services.AddAuthentication(options => { options.DefaultAuthenticateScheme = "BookingCustomer"; options.DefaultChallengeScheme = "BookingCustomer"; }).AddJwtBearer("BookingCustomer", options =>
{
    var key = builder.Configuration["Jwt:Key"] ?? builder.Configuration["JWT_SECRET"] ?? "EventPassDefaultSecureJwtSecretKeyAtLeast32Bytes!";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false, ValidateAudience = false, ValidateLifetime = true,
        ValidateIssuerSigningKey = true, RequireSignedTokens = true, RequireExpirationTime = true,
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(15),
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
    };
});

// 8. Đăng ký Application Services (Business Logic Layer)
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IKioskService, KioskService>();
builder.Services.AddScoped<IKioskNotificationService, KioskNotificationService>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthenticationService>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddScoped<IAttendeeService, TicketDetailRepository>();
builder.Services.AddScoped<ITransactionService, TransactionRepository>();

builder.Services.AddScoped<IFileStorageService, DropboxStorageService>();
builder.Services.AddScoped<IFileStorageServices, LocalFileStorageService>();

// 9. Đăng ký SignalR (Realtime Notification)
builder.Services.AddSignalR();

// 10. Đăng ký Web API Controllers & Swagger UI
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Nhập token JWT (không cần gõ tiền tố Bearer)",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var app = builder.Build();

// ==============================================================================
// 11. Tự động áp dụng Migration và Seed Database khi khởi chạy ứng dụng
// ==============================================================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var dbContext = services.GetRequiredService<AppDbContext>();
        await dbContext.Database.MigrateAsync();
        app.Logger.LogInformation("Database migrations applied successfully.");

        var bcryptHasher = services.GetRequiredService<IPasswordHasher>();
        var result = await DatabaseSeeder.InitializeAsync(dbContext, (user, password) => bcryptHasher.HashPassword(password));
        app.Logger.LogInformation("Seed hoàn tất: thêm {UsersAdded} tài khoản, {EventsAdded} sự kiện.", result.UsersAdded, result.EventsAdded);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "An error occurred while migrating the database.");
        throw;
    }
}

if (seedOnly) return;

// Cấu hình Swagger UI trực quan
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "EventPass API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR Hub
app.MapHub<KioskHub>("/hubs/kiosk");
app.MapHub<TransactionHub>("/hubs/transactions");

app.Run();

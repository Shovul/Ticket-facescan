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
using EventPass.Domain.Entities;
using Microsoft.AspNetCore.Identity;

var seedOnly = args.Any(a => a.Equals("--seed", StringComparison.OrdinalIgnoreCase));
var builder = WebApplication.CreateBuilder(args.Where(a => !a.Equals("--seed", StringComparison.OrdinalIgnoreCase)).ToArray());

// Khóa phiên thử chỉ tồn tại trong lần chạy Development, không dùng cho môi trường triển khai.

// 1. Cấu hình Database PostgreSQL 16 + pgvector HNSW
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseVector();
    });
    options.UseSnakeCaseNamingConvention();
});
builder.Services.AddScoped<DbContext>(sp => sp.GetRequiredService<AppDbContext>());

// 2. Cấu hình CORS phục vụ Frontend Next.js và Kiosk Native App
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

// 3. Đăng ký HttpClient cho FastAPI AI Service
builder.Services.AddHttpClient<IAiServiceClient, AiServiceClient>();

// 4. Đăng ký Repositories (Data Access Layer)
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

// Scheme riêng cho đặt vé; không tự xây dựng đăng nhập hay cấp token của phân hệ tài khoản.
builder.Services.AddAuthentication().AddJwtBearer("BookingCustomer", options =>
{
    var key = builder.Configuration["Jwt:Key"] ?? builder.Configuration["JWT_SECRET"] ?? "";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true,
        ValidateIssuerSigningKey = true, RequireSignedTokens = true, RequireExpirationTime = true,
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256], ClockSkew = TimeSpan.FromSeconds(15),
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "EventPass",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "EventPass.Customer",
        IssuerSigningKey = key.Length >= 32 ? new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)) : null
    };
});

// 5. Đăng ký Application Services (Business Logic Layer)
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IKioskService, KioskService>();
builder.Services.AddScoped<IKioskNotificationService, KioskNotificationService>();

// 6. Đăng ký SignalR (Realtime Notification)
builder.Services.AddSignalR();

// 7. Đăng ký Web API Controllers & Swagger UI
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("BookingBearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Type = Microsoft.OpenApi.SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT",
        Description = "Token đăng nhập khách hàng dùng cho API đặt vé."
    });
    options.AddSecurityRequirement(document => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        [new Microsoft.OpenApi.OpenApiSecuritySchemeReference("BookingBearer", document)] = []
    });
});

var app = builder.Build();

// Seed dữ liệu local sau khi đã cập nhật migration, không tự thay đổi schema database.
if (seedOnly && !app.Environment.IsDevelopment())
    throw new InvalidOperationException("Chỉ chạy seed dữ liệu mẫu trong môi trường Development.");
if (app.Environment.IsDevelopment() && (seedOnly || app.Configuration.GetValue<bool>("DatabaseSeed:Enabled")))
{
    await using var scope = app.Services.CreateAsyncScope();
    var hasher = new PasswordHasher<User>();
    var result = await DatabaseSeeder.InitializeAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), hasher.HashPassword);
    app.Logger.LogInformation("Seed hoàn tất: thêm {UsersAdded} tài khoản, {EventsAdded} sự kiện.", result.UsersAdded, result.EventsAdded);
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

app.Run();

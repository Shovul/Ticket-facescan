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

// KhÃ³a phiÃªn thá»­ chá»‰ tá»“n táº¡i trong láº§n cháº¡y Development, khÃ´ng dÃ¹ng cho mÃ´i trÆ°á»ng triá»ƒn khai.

// 1. Cáº¥u hÃ¬nh Database PostgreSQL 16 + pgvector HNSW
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

// 2. Cáº¥u hÃ¬nh CORS phá»¥c vá»¥ Frontend Next.js vÃ  Kiosk Native App
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

// 3. ÄÄƒng kÃ½ HttpClient cho FastAPI AI Service
builder.Services.AddHttpClient<IAiServiceClient, AiServiceClient>();

// 4. ÄÄƒng kÃ½ Repositories (Data Access Layer)
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

// Scheme riÃªng cho Ä‘áº·t vÃ©; khÃ´ng tá»± xÃ¢y dá»±ng Ä‘Äƒng nháº­p hay cáº¥p token cá»§a phÃ¢n há»‡ tÃ i khoáº£n.
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

// 5. ÄÄƒng kÃ½ Application Services (Business Logic Layer)
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IKioskService, KioskService>();
builder.Services.AddScoped<IKioskNotificationService, KioskNotificationService>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthenticationService>();
builder.Services.AddScoped<IUserService, UserService>();

// 6. ÄÄƒng kÃ½ SignalR (Realtime Notification)
builder.Services.AddSignalR();

// 7. ÄÄƒng kÃ½ Web API Controllers & Swagger UI
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Seed dá»¯ liá»‡u local sau khi Ä‘Ã£ cáº­p nháº­t migration, khÃ´ng tá»± thay Ä‘á»•i schema database.
if (seedOnly && !app.Environment.IsDevelopment())
    throw new InvalidOperationException("Chá»‰ cháº¡y seed dá»¯ liá»‡u máº«u trong mÃ´i trÆ°á»ng Development.");
if (app.Environment.IsDevelopment() && (seedOnly || app.Configuration.GetValue<bool>("DatabaseSeed:Enabled")))
{
    await using var scope = app.Services.CreateAsyncScope();
    var hasher = new PasswordHasher<User>();
    var result = await DatabaseSeeder.InitializeAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), hasher.HashPassword);
    app.Logger.LogInformation("Seed hoÃ n táº¥t: thÃªm {UsersAdded} tÃ i khoáº£n, {EventsAdded} sá»± kiá»‡n.", result.UsersAdded, result.EventsAdded);
}
if (seedOnly) return;

// Cáº¥u hÃ¬nh Swagger UI trá»±c quan
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


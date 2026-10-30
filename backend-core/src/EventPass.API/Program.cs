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

// KhÃƒÂ³a phiÃƒÂªn thÃ¡Â»Â­ chÃ¡Â»â€° tÃ¡Â»â€œn tÃ¡ÂºÂ¡i trong lÃ¡ÂºÂ§n chÃ¡ÂºÂ¡y Development, khÃƒÂ´ng dÃƒÂ¹ng cho mÃƒÂ´i trÃ†Â°Ã¡Â»Âng triÃ¡Â»Æ’n khai.

// 1. CÃ¡ÂºÂ¥u hÃƒÂ¬nh Database PostgreSQL 16 + pgvector HNSW
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

// 2. CÃ¡ÂºÂ¥u hÃƒÂ¬nh CORS phÃ¡Â»Â¥c vÃ¡Â»Â¥ Frontend Next.js vÃƒÂ  Kiosk Native App
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

// 3. Ã„ÂÃ„Æ’ng kÃƒÂ½ HttpClient cho FastAPI AI Service
builder.Services.AddHttpClient<IAiServiceClient, AiServiceClient>();

// 4. Ã„ÂÃ„Æ’ng kÃƒÂ½ Repositories (Data Access Layer)
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

// Scheme riÃƒÂªng cho Ã„â€˜Ã¡ÂºÂ·t vÃƒÂ©; khÃƒÂ´ng tÃ¡Â»Â± xÃƒÂ¢y dÃ¡Â»Â±ng Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p hay cÃ¡ÂºÂ¥p token cÃ¡Â»Â§a phÃƒÂ¢n hÃ¡Â»â€¡ tÃƒÂ i khoÃ¡ÂºÂ£n.
builder.Services.AddAuthentication(options => { options.DefaultAuthenticateScheme = "BookingCustomer"; options.DefaultChallengeScheme = "BookingCustomer"; }).AddJwtBearer("BookingCustomer", options =>
{
    var key = builder.Configuration["Jwt:Key"] ?? builder.Configuration["JWT_SECRET"] ?? "EventPassDefaultSecureJwtSecretKeyAtLeast32Bytes!";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false, ValidateAudience = false, ValidateLifetime = true,
        ValidateIssuerSigningKey = true, RequireSignedTokens = true, RequireExpirationTime = true,
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(15),
        // ValidAudience checked by TokenValidationParameters
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
    };
});

// 5. Ã„ÂÃ„Æ’ng kÃƒÂ½ Application Services (Business Logic Layer)
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IKioskService, KioskService>();
builder.Services.AddScoped<IKioskNotificationService, KioskNotificationService>();
builder.Services.AddScoped<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthenticationService>();
builder.Services.AddScoped<IUserService, UserService>();

// 6. Ã„ÂÃ„Æ’ng kÃƒÂ½ SignalR (Realtime Notification)
builder.Services.AddSignalR();

// 7. Ã„ÂÃ„Æ’ng kÃƒÂ½ Web API Controllers & Swagger UI
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Seed dÃ¡Â»Â¯ liÃ¡Â»â€¡u local sau khi Ã„â€˜ÃƒÂ£ cÃ¡ÂºÂ­p nhÃ¡ÂºÂ­t migration, khÃƒÂ´ng tÃ¡Â»Â± thay Ã„â€˜Ã¡Â»â€¢i schema database.
if (seedOnly && !app.Environment.IsDevelopment())
    throw new InvalidOperationException("ChÃ¡Â»â€° chÃ¡ÂºÂ¡y seed dÃ¡Â»Â¯ liÃ¡Â»â€¡u mÃ¡ÂºÂ«u trong mÃƒÂ´i trÃ†Â°Ã¡Â»Âng Development.");
if (app.Environment.IsDevelopment() && (seedOnly || app.Configuration.GetValue<bool>("DatabaseSeed:Enabled")))
{
    await using var scope = app.Services.CreateAsyncScope();
    var hasher = new PasswordHasher<User>();
    var result = await DatabaseSeeder.InitializeAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>(), hasher.HashPassword);
    app.Logger.LogInformation("Seed hoÃƒÂ n tÃ¡ÂºÂ¥t: thÃƒÂªm {UsersAdded} tÃƒÂ i khoÃ¡ÂºÂ£n, {EventsAdded} sÃ¡Â»Â± kiÃ¡Â»â€¡n.", result.UsersAdded, result.EventsAdded);
}
if (seedOnly) return;

// CÃ¡ÂºÂ¥u hÃƒÂ¬nh Swagger UI trÃ¡Â»Â±c quan
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


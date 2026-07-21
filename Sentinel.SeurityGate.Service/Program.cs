using Serilog;
using Serilog.Formatting.Compact;
using Sentinel.SecurityGate.Service.BackgroundServices;
using Sentinel.SecurityGate.Service.Configuration;
using Sentinel.SecurityGate.Service.Services;

var loggerConfig = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext();

if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production")
    loggerConfig.WriteTo.Console(new CompactJsonFormatter());
else
    loggerConfig.WriteTo.Console();

Log.Logger = loggerConfig.CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();

// HttpClient Factory
builder.Services.AddHttpClient();

// RabbitMQ Configuration
var rabbitMqConfig = new RabbitMqConfiguration();
builder.Configuration.GetSection("RabbitMQ").Bind(rabbitMqConfig);
builder.Services.AddSingleton(rabbitMqConfig);

// Register Services
builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddScoped<HttpScanOrchestrator>();

// Background Services
builder.Services.AddHostedService<ScanResultListener>();
builder.Services.AddHostedService<ScanRequestListener>();

// CORS: fail closed — sin JavaBFF:Origin configurado, rechaza en vez de abrir a "*"
var javaBffOrigin = builder.Configuration["JavaBFF:Origin"];
if (string.IsNullOrWhiteSpace(javaBffOrigin))
{
    throw new InvalidOperationException("JavaBFF:Origin no configurado — CORS rechazado por fail-closed");
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowJavaBFF", policy =>
    {
        policy.WithOrigins(javaBffOrigin)
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
// Production is behind Kong reverse proxy — Swagger and HTTPS handled externally.

app.UseCors("AllowJavaBFF");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "security-gate-service" }));

app.Logger.LogInformation("Sentinel SecurityGate Service iniciado");

app.Run();

// Required for WebApplicationFactory<T> in integration tests
public partial class Program { }

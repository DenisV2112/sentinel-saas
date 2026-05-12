using Serilog;
using Serilog.Formatting.Compact;
using Serilog;
using Serilog.Formatting.Compact;
using Sentinel.SecurityGate.Service.BackgroundServices;
using Sentinel.SecurityGate.Service.Configuration;
using Sentinel.SecurityGate.Service.Services;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.FromLogContext()
    .WriteTo.Console(
        Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production"
            ? new CompactJsonFormatter()
            : null)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// HttpClient Factory
builder.Services.AddHttpClient();

// RabbitMQ Configuration
var rabbitMqConfig = new RabbitMqConfiguration();
builder.Configuration.GetSection("RabbitMQ").Bind(rabbitMqConfig);
builder.Services.AddSingleton(rabbitMqConfig);

// Register Services
builder.Services.AddSingleton<IRabbitMqService, RabbitMqService>();
builder.Services.AddScoped<IScanOrchestrator, HttpScanOrchestrator>();

// Background Services
builder.Services.AddHostedService<ScanResultListener>();
builder.Services.AddHostedService<ScanRequestListener>();

// CORS (si es necesario para tu Java BFF)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowJavaBFF", policy =>
    {
        policy.WithOrigins(builder.Configuration["JavaBFF:Origin"] ?? "*")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseHttpsRedirection(); // Only needed in dev; production is behind Kong reverse proxy
}

app.UseCors("AllowJavaBFF");
app.UseAuthorization();
app.MapControllers();

app.Logger.LogInformation("Sentinel SecurityGate Service iniciado");

app.Run();

// Required for WebApplicationFactory<T> in integration tests
public partial class Program { }
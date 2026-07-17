using Serilog;
using Serilog.Formatting.Compact;
using Sentinel.CodeQuality.Service.DTOs;
using Sentinel.CodeQuality.Service.Services;
using Sentinel.Common.Infrastructure.Publishers;
using Sentinel.Common.Infrastructure.Services;

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

builder.Services.AddControllers();

builder.Services.AddSingleton<IReportPublisher<ScanFinalResultDto>, ReportPublisher<ScanFinalResultDto>>();

// Servicios de dominio
builder.Services.AddScoped<Sentinel.Common.Infrastructure.Services.VolumeFileReader>();
builder.Services.AddScoped<SemgrepMapper>();
builder.Services.AddScoped<QualityGateEvaluator>();


var app = builder.Build();

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "code-quality-service" }));

app.Run();

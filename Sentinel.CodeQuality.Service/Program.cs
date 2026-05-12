using Serilog;
using Serilog.Formatting.Compact;
using Serilog;
using Serilog.Formatting.Compact;
using Sentinel.CodeQuality.Service.Publishers;
using Sentinel.CodeQuality.Service.Services;

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

builder.Services.AddControllers();

builder.Services.AddSingleton<IReportPublisher, ReportPublisher>();

// Servicios de dominio
builder.Services.AddScoped<IResultReader, VolumeFileReader>();
builder.Services.AddScoped<SemgrepMapper>();
builder.Services.AddScoped<QualityGateEvaluator>();


var app = builder.Build();

app.MapControllers();

app.Run();
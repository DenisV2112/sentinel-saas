using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Net;
using Xunit;

namespace Sentinel.SecurityGate.Service.Tests;

/// <summary>
/// E5: Verifies that app.UseHttpsRedirection() is gated behind
/// app.Environment.IsDevelopment() so that HTTP requests behind
/// Kong reverse proxy are NOT redirected to HTTPS in production.
///
/// Note: The ASP.NET Core TestServer does not support HTTPS
/// endpoint configuration, so we cannot produce a true RED
/// (307 redirect) from UseHttpsRedirection() in the test environment.
/// Instead, this test validates that:
/// 1. The app boots successfully in Production mode.
/// 2. The /api/health endpoint returns 200 OK (the observable
///    behavior required by the spec).
///
/// The Program.cs source-level gate is verified by code review
/// and the "Source Level" test below.
/// </summary>
public class NoHttpsRedirectInProductionTest : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public NoHttpsRedirectInProductionTest(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");

            // Remove hosted services (RabbitMQ listeners) that would
            // try to connect to infrastructure during the test.
            builder.ConfigureServices(services =>
            {
                var hostedServiceDescriptors = services
                    .Where(s => typeof(IHostedService).IsAssignableFrom(s.ServiceType))
                    .ToList();

                foreach (var descriptor in hostedServiceDescriptors)
                {
                    services.Remove(descriptor);
                }
            });
        });
    }

    /// <summary>
    /// Verifies the app boots and responds in Production mode
    /// (the observable behavior from the spec).
    /// </summary>
    [Fact]
    public async Task Get_ApiHealth_In_Production_Returns_Ok()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act — send HTTP request to health endpoint
        var response = await client.GetAsync("/api/health");

        // Assert — 200 OK (not 307 redirect)
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>
    /// Verifies readiness endpoint works in Production.
    /// </summary>
    [Fact]
    public async Task Get_ApiHealthReady_In_Production_Returns_Ok()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/health/ready");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    /// <summary>
    /// Source-level verification that UseHttpsRedirection() is only
    /// called inside an IsDevelopment() guard. This serves as a
    /// safety net since the test server cannot reproduce HTTPS redirects.
    /// </summary>
    [Fact]
    public void Program_UseHttpsRedirection_Is_Gated_Behind_Development_Check()
    {
        var programSource = File.ReadAllText(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Program.cs"));

        // UseHttpsRedirection() must NOT appear after the IsDevelopment() block
        // outside any guard. It should only be inside or not present at all.
        var lines = programSource.Split('\n');
        var useHttpsFoundOutsideGuard = false;
        var insideIsDevelopmentBlock = false;

        foreach (var line in lines)
        {
            var trimmed = line.Trim();

            if (trimmed.Contains("IsDevelopment()"))
                insideIsDevelopmentBlock = true;

            if (trimmed.Contains("}") && insideIsDevelopmentBlock)
                insideIsDevelopmentBlock = false;

            if (trimmed.Contains("UseHttpsRedirection()") && !insideIsDevelopmentBlock)
                useHttpsFoundOutsideGuard = true;
        }

        Assert.False(useHttpsFoundOutsideGuard,
            "UseHttpsRedirection() must be gated inside IsDevelopment() check. " +
            "Found outside the development guard — this would cause HTTPS redirects " +
            "in Production behind the Kong reverse proxy.");
    }
}

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Sentinel.SecurityGate.Service.Dtos;
using Sentinel.SecurityGate.Service.Services;
using System.Net;
using System.Text.Json;
using Xunit;

namespace Sentinel.SecurityGate.Service.Tests;

/// <summary>
/// D5: Verifies that HttpScanOrchestrator does NOT leak secrets
/// (tokens, passwords) in debug log output.
///
/// RED phase: These tests should FAIL because current code logs the
/// full payload (including ClientGitToken, authentication passwords/tokens)
/// via LogDebug at L57-58.
/// </summary>
public class HttpScanOrchestratorSecretRedactionTest
{
    /// <summary>
    /// Captures logged messages for assertion.
    /// </summary>
    private class LogCapture : List<string>
    {
        public void HandleLog<TState>(LogLevel logLevel, EventId eventId, TState state,
            Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var message = formatter(state, exception);
            // Store debug-level messages for checking
            if (logLevel == LogLevel.Debug)
            {
                Add(message);
            }
        }
    }

    [Fact]
    public async Task DebugPayload_Should_Not_Contain_ClientGitToken()
    {
        // Arrange
        var logCapture = new LogCapture();
        var logger = CreateDebugLogger(logCapture);
        var orchestrator = CreateOrchestrator(logger);

        var command = new ScanCommandDto
        {
            ScanId = Guid.NewGuid(),
            ScanType = "SAST",
            ClientId = Guid.NewGuid().ToString(),
            RepositoryUrl = "https://github.com/test/repo",
            Branch = "main",
            ClientGitToken = "ghp_sUp3rS3cr3tT0k3n12345abcde" // This MUST be redacted
        };

        // Act
        await orchestrator.StartScanWorkflowAsync(command);

        // Assert: Debug output should NOT contain the raw token
        var allDebugOutput = string.Join(" ", logCapture);
        Assert.DoesNotContain("ghp_sUp3rS3cr3tT0k3n12345abcde", allDebugOutput);
    }

    [Fact]
    public async Task DebugPayload_Should_Not_Contain_Authentication_Password()
    {
        // Arrange
        var logCapture = new LogCapture();
        var logger = CreateDebugLogger(logCapture);
        var orchestrator = CreateOrchestrator(logger);

        var command = new ScanCommandDto
        {
            ScanId = Guid.NewGuid(),
            ScanType = "DAST",
            ClientId = Guid.NewGuid().ToString(),
            TargetUrl = "https://test.example.com",
            Authentication = new DastAuthenticationDto
            {
                AuthType = "basic",
                Username = "admin",
                Password = "SuperSecretPassword123!" // MUST be redacted
            }
        };

        // Act
        await orchestrator.StartScanWorkflowAsync(command);

        // Assert: Debug output should NOT contain the raw password
        var allDebugOutput = string.Join(" ", logCapture);
        Assert.DoesNotContain("SuperSecretPassword123!", allDebugOutput);
    }

    [Fact]
    public async Task DebugPayload_Should_Not_Contain_Authentication_Token()
    {
        // Arrange
        var logCapture = new LogCapture();
        var logger = CreateDebugLogger(logCapture);
        var orchestrator = CreateOrchestrator(logger);

        var command = new ScanCommandDto
        {
            ScanId = Guid.NewGuid(),
            ScanType = "DAST",
            ClientId = Guid.NewGuid().ToString(),
            TargetUrl = "https://test.example.com",
            Authentication = new DastAuthenticationDto
            {
                AuthType = "bearer",
                Token = "Bearer eyJhbGciOiJIUzI1NiJ9.secret" // MUST be redacted
            }
        };

        // Act
        await orchestrator.StartScanWorkflowAsync(command);

        // Assert: Debug output should NOT contain the raw token
        var allDebugOutput = string.Join(" ", logCapture);
        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiJ9.secret", allDebugOutput);
    }

    private static ILogger<HttpScanOrchestrator> CreateDebugLogger(LogCapture capture)
    {
        var loggerMock = new Mock<ILogger<HttpScanOrchestrator>>();

        loggerMock
            .Setup(x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception?>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)))
            .Callback(new InvocationAction(invocation =>
            {
                var level = (LogLevel)invocation.Arguments[0];
                if (level != LogLevel.Debug) return;

                var state = invocation.Arguments[2];
                var formatter = invocation.Arguments[4];
                var formatted = formatter?.GetType()
                    .GetMethod("Invoke")?
                    .Invoke(formatter, new[] { state, null }) as string ?? "";

                capture.Add(formatted);
            }));

        // Enable Debug level
        loggerMock
            .Setup(x => x.IsEnabled(LogLevel.Debug))
            .Returns(true);

        return loggerMock.Object;
    }

    private static HttpScanOrchestrator CreateOrchestrator(ILogger<HttpScanOrchestrator> logger)
    {
        // Use a mock HttpMessageHandler that returns 200 OK for any request
        var handler = new MockHttpMessageHandler();
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost:9999")
        };

        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock
            .Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(httpClient);

        var configData = new Dictionary<string, string?>
        {
            { "N8n:BaseUrl", "http://localhost:9999" },
            { "ScannerOrchestrator:BaseUrl", "http://localhost:8086" },
            { "ScannerOrchestrator:UpdateStatusEndpoint", "/api/internal/scans/{scanId}/status" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        return new HttpScanOrchestrator(logger, httpClientFactoryMock.Object, configuration);
    }

    /// <summary>
    /// Returns 200 OK for any request — we only care about the payload being logged.
    /// </summary>
    private class MockHttpMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"status\":\"ok\"}")
            };
            return Task.FromResult(response);
        }
    }
}

using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Sentinel.SecurityGate.Service.Models;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;

namespace Sentinel.SecurityGate.Service.Tests;

/// <summary>
/// Verifies that ScanResultListener calls the orchestrator's
/// /api/internal/scans/{scanId}/results endpoint when scan results arrive.
///
/// The orchestrator callback is the KEY FIX in the end-to-end scan pipeline:
/// it marks the ScanJob as COMPLETED, replacing the 300s auto-complete timeout.
/// </summary>
public class ScanResultListenerOrchestratorCallbackTest
{
    private const string ExpectedOrchestratorBaseUrl = "http://scaner-orchestrator-service:8086";
    private const string ExpectedOrchestratorEndpoint = "/api/internal/scans/";

    /// <summary>
    /// Captures the HTTP requests made by the SUT for assertion.
    /// </summary>
    private class HttpCapture : List<HttpRequestMessage>
    {
        public void Capture(HttpRequestMessage request)
        {
            Add(request);
        }
    }

    [Fact]
    public async Task ProcessScanResult_Should_Post_Completed_To_Orchestrator()
    {
        // Arrange
        var scanId = Guid.NewGuid();
        var httpCapture = new HttpCapture();
        var httpClientFactory = CreateHttpClientFactory(httpCapture);
        var configuration = BuildConfiguration();
        var logger = Mock.Of<ILogger<BackgroundServices.ScanResultListener>>();

        var scanResult = new ScanResult
        {
            ScanId = scanId,
            ScanType = "SAST",
            Status = Models.ScanStatus.Completed,
            QualityGatePassed = true,
            CompletedAt = DateTime.UtcNow,
            Summary = new SeveritySummary
            {
                Critical = 0,
                High = 2,
                Medium = 5,
                Low = 3
            }
        };

        // Act — simulate what ProcessScanResultAsync does
        await InvokeProcessScanResultAsync(scanResult, httpClientFactory, configuration, logger);

        // Assert: Exactly 2 HTTP calls were made (BFF webhook + orchestrator callback)
        Assert.Equal(2, httpCapture.Count);

        // Find the orchestrator call (the second POST, to the orchestrator URL)
        var orchestratorCall = httpCapture.FirstOrDefault(r =>
            r.RequestUri!.AbsoluteUri.StartsWith(ExpectedOrchestratorBaseUrl));
        Assert.NotNull(orchestratorCall);
        Assert.Equal(HttpMethod.Post, orchestratorCall.Method);

        // Verify the URL ends with the expected endpoint + scanId
        Assert.Contains(ExpectedOrchestratorEndpoint + scanId.ToString(), orchestratorCall.RequestUri.AbsoluteUri);
        Assert.Contains("/results", orchestratorCall.RequestUri.AbsoluteUri);

        // Verify the request body contains status COMPLETED
        var body = await orchestratorCall.Content!.ReadAsStringAsync();
        var json = JsonDocument.Parse(body);
        Assert.Equal("COMPLETED", json.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ProcessScanResult_Should_Not_Throw_When_Orchestrator_Unreachable()
    {
        // Arrange
        var scanId = Guid.NewGuid();
        var httpCapture = new HttpCapture();

        // Create a handler that throws (simulates unreachable orchestrator)
        var throwHandler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        throwHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Throws(new HttpRequestException("Connection refused"));

        var httpClient = new HttpClient(throwHandler.Object);
        var httpClientFactory = Mock.Of<IHttpClientFactory>(f =>
            f.CreateClient(It.IsAny<string>()) == httpClient);

        var configuration = BuildConfiguration();
        var logger = Mock.Of<ILogger<BackgroundServices.ScanResultListener>>();

        var scanResult = new ScanResult
        {
            ScanId = scanId,
            ScanType = "SAST",
            Status = Models.ScanStatus.Completed,
            QualityGatePassed = true,
            CompletedAt = DateTime.UtcNow
        };

        // Act & Assert — should NOT throw despite unreachable orchestrator
        var exception = await Record.ExceptionAsync(() =>
            InvokeProcessScanResultAsync(scanResult, httpClientFactory, configuration, logger));

        Assert.Null(exception);
    }

    /// <summary>
    /// Invokes the ProcessScanResultAsync logic by creating a minimal service provider
    /// and calling the method via the protected/private route.
    ///
    /// Since ProcessScanResultAsync is private, we use a test double that exposes it.
    /// </summary>
    private static async Task InvokeProcessScanResultAsync(
        ScanResult scanResult,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<BackgroundServices.ScanResultListener> logger)
    {
        var services = new ServiceCollection();
        services.AddSingleton(httpClientFactory);
        services.AddSingleton(configuration);
        services.AddSingleton(logger);
        var serviceProvider = services.BuildServiceProvider();

        // Create a testable wrapper that exposes ProcessScanResultAsync
        var listener = new TestableScanResultListener(logger, serviceProvider);
        await listener.CallProcessScanResultAsync(JsonSerializer.Serialize(scanResult));
    }

    private static IHttpClientFactory CreateHttpClientFactory(HttpCapture capture)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Returns<HttpRequestMessage, CancellationToken>((request, ct) =>
            {
                capture.Capture(request);
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
            });

        var httpClient = new HttpClient(handler.Object);
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(httpClient);
        return factory.Object;
    }

    private static IConfiguration BuildConfiguration()
    {
        var configData = new Dictionary<string, string?>
        {
            { "JavaBFF:WebhookUrl", "http://backend-for-frontend-service:8080/api/bff/scans/webhook" },
            { "ScannerOrchestrator:BaseUrl", ExpectedOrchestratorBaseUrl },
            { "ScannerOrchestrator:UpdateResultsEndpoint", "/api/internal/scans/{scanId}/results" }
        };
        return new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
    }

    /// <summary>
    /// Testable subclass that exposes the private ProcessScanResultAsync method.
    /// </summary>
    private class TestableScanResultListener : BackgroundServices.ScanResultListener
    {
        private readonly IServiceProvider _serviceProvider;

        public TestableScanResultListener(
            ILogger<BackgroundServices.ScanResultListener> logger,
            IServiceProvider serviceProvider)
            : base(logger, serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task CallProcessScanResultAsync(string message)
        {
            // Use reflection to invoke the private method
            var method = typeof(BackgroundServices.ScanResultListener)
                .GetMethod("ProcessScanResultAsync",
                    System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

            if (method != null)
            {
                var task = (Task)method.Invoke(this, new object[] { message, _serviceProvider })!;
                await task;
            }
        }
    }
}

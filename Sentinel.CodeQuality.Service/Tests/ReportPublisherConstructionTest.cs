using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Sentinel.CodeQuality.Service.Publishers;
using Xunit;

namespace Sentinel.CodeQuality.Service.Tests;

/// <summary>
/// D3: Verifies ReportPublisher constructor does NOT use sync-over-async
/// (.GetAwaiter().GetResult()) and succeeds without a running RabbitMQ server.
///
/// RED phase: This test should FAIL because the current constructor calls
/// TryEnsureConnectionAsync().GetAwaiter().GetResult() which blocks the thread
/// and would timeout when RabbitMQ is unavailable.
/// </summary>
public class ReportPublisherConstructionTest
{
    [Fact]
    public void Constructor_Should_Succeed_Without_RabbitMQ_Available()
    {
        // Arrange: minimal config without RabbitMQ (port 9999 = no server)
        var configData = new Dictionary<string, string?>
        {
            { "RabbitMQ:HostName", "localhost" },
            { "RabbitMQ:Port", "9999" },
            { "RabbitMQ:Username", "guest" },
            { "RabbitMQ:Password", "guest" },
            { "RabbitMQ:Exchange", "test.exchange" },
            { "RabbitMQ:RoutingKey", "test.key" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        var loggerMock = new Mock<ILogger<ReportPublisher>>();

        // Act: Constructor should NOT block or throw — connection is lazy
        ReportPublisher? publisher = null;
        var exception = Record.Exception(() =>
        {
            publisher = new ReportPublisher(configuration, loggerMock.Object);
        });

        // Assert: Constructor succeeded without RabbitMQ
        Assert.Null(exception);
        Assert.NotNull(publisher);

        // Cleanup
        publisher?.Dispose();
    }

    [Fact]
    public void Constructor_Should_Complete_Within_Reasonable_Time()
    {
        // Arrange: unreachable host (255.255.255.255)
        var configData = new Dictionary<string, string?>
        {
            { "RabbitMQ:HostName", "255.255.255.255" },
            { "RabbitMQ:Port", "5672" },
            { "RabbitMQ:Username", "guest" },
            { "RabbitMQ:Password", "guest" },
            { "RabbitMQ:Exchange", "test.exchange" },
            { "RabbitMQ:RoutingKey", "test.key" }
        };

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();

        var loggerMock = new Mock<ILogger<ReportPublisher>>();

        // Act: Constructor must complete quickly (no blocking connection attempts)
        var start = DateTime.UtcNow;
        ReportPublisher? publisher = null;
        var exception = Record.Exception(() =>
        {
            publisher = new ReportPublisher(configuration, loggerMock.Object);
        });
        var elapsed = DateTime.UtcNow - start;

        // Assert: No exception, completed in under 2 seconds
        // (current code with GetAwaiter().GetResult() + retries would take 10+ seconds)
        Assert.Null(exception);
        Assert.NotNull(publisher);
        Assert.True(elapsed.TotalSeconds < 2,
            $"Constructor took {elapsed.TotalSeconds:F1}s — should complete in < 2s. " +
            "Remove GetAwaiter().GetResult() from constructor.");

        publisher?.Dispose();
    }
}

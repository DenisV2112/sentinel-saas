using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Sentinel.Common.Infrastructure.Publishers;
using Xunit;

namespace Sentinel.Common.Infrastructure.Tests;

/// <summary>
/// DTO de prueba que implementa IHasScanId para poder testear el ReportPublisher genérico.
/// </summary>
public class TestScanResultDto : IHasScanId
{
    public string ScanId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Verifica que ReportPublisher&lt;T&gt; no usa sync-over-async en el constructor
/// y que la conexión es lazy.
/// </summary>
public class ReportPublisherConstructionTest
{
    [Fact]
    public void Constructor_Should_Succeed_Without_RabbitMQ_Available()
    {
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

        var loggerMock = new Mock<ILogger<ReportPublisher<TestScanResultDto>>>();

        ReportPublisher<TestScanResultDto>? publisher = null;
        var exception = Record.Exception(() =>
        {
            publisher = new ReportPublisher<TestScanResultDto>(configuration, loggerMock.Object);
        });

        Assert.Null(exception);
        Assert.NotNull(publisher);

        publisher?.Dispose();
    }

    [Fact]
    public void Constructor_Should_Complete_Within_Reasonable_Time()
    {
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

        var loggerMock = new Mock<ILogger<ReportPublisher<TestScanResultDto>>>();

        var start = DateTime.UtcNow;
        ReportPublisher<TestScanResultDto>? publisher = null;
        var exception = Record.Exception(() =>
        {
            publisher = new ReportPublisher<TestScanResultDto>(configuration, loggerMock.Object);
        });
        var elapsed = DateTime.UtcNow - start;

        Assert.Null(exception);
        Assert.NotNull(publisher);
        Assert.True(elapsed.TotalSeconds < 5,
            $"Constructor took {elapsed.TotalSeconds:F1}s — should complete in < 5s. " +
            "Remove GetAwaiter().GetResult() from constructor.");

        publisher?.Dispose();
    }

    [Fact]
    public async Task PublishFinalResultAsync_Should_Throw_On_Null_DTO()
    {
        var configData = new Dictionary<string, string?>
        {
            { "RabbitMQ:HostName", "localhost" },
            { "RabbitMQ:Port", "9999" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
        var loggerMock = new Mock<ILogger<ReportPublisher<TestScanResultDto>>>();
        var publisher = new ReportPublisher<TestScanResultDto>(configuration, loggerMock.Object);
        try
        {
            await Assert.ThrowsAsync<ArgumentNullException>(
                () => publisher.PublishFinalResultAsync(null!));
        }
        finally
        {
            publisher.Dispose();
        }
    }

    [Fact]
    public void Dispose_Should_Be_Idempotent()
    {
        var configData = new Dictionary<string, string?>
        {
            { "RabbitMQ:HostName", "localhost" },
            { "RabbitMQ:Port", "9999" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
        var loggerMock = new Mock<ILogger<ReportPublisher<TestScanResultDto>>>();
        var publisher = new ReportPublisher<TestScanResultDto>(configuration, loggerMock.Object);

        var ex = Record.Exception(() =>
        {
            publisher.Dispose();
            publisher.Dispose(); // double dispose should not throw
        });

        Assert.Null(ex);
    }

    [Fact]
    public void InvalidateConnection_Should_Not_Throw_When_Never_Connected()
    {
        var configData = new Dictionary<string, string?>
        {
            { "RabbitMQ:HostName", "localhost" },
            { "RabbitMQ:Port", "9999" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configData)
            .Build();
        var loggerMock = new Mock<ILogger<ReportPublisher<TestScanResultDto>>>();
        var publisher = new ReportPublisher<TestScanResultDto>(configuration, loggerMock.Object);

        var ex = Record.Exception(() => publisher.InvalidateConnection());

        Assert.Null(ex);
        publisher.Dispose();
    }
}

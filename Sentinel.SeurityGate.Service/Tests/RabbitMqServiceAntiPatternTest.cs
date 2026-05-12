using Xunit;

namespace Sentinel.SecurityGate.Service.Tests;

/// <summary>
/// D4: Verifies RabbitMqService does NOT use Task.Run anti-pattern
/// in PublishScanRequestAsync and PublishScanResultAsync implementations.
///
/// All method names appear twice: once in the IRabbitMqService interface
/// (L12-L15) and once in the RabbitMqService implementation (L99-L189).
/// Tests target the SECOND occurrence = the implementation.
/// </summary>
public class RabbitMqServiceAntiPatternTest
{
    private static string ReadSourceFile()
    {
        var projectRoot = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory, "..", "..", "..", ".."));
        return File.ReadAllText(Path.Combine(projectRoot, "Services", "RabbitMqService.cs"));
    }

    /// <summary>Find the Nth occurrence of a substring in source.</summary>
    private static int IndexOfNth(string source, string search, int n)
    {
        int index = -1;
        for (int i = 0; i < n; i++)
        {
            index = source.IndexOf(search, index + 1);
            if (index < 0) return -1;
        }
        return index;
    }

    [Fact]
    public void PublishScanRequestAsync_Impl_Should_Not_Use_TaskRun()
    {
        var source = ReadSourceFile();

        // 2nd occurrence = implementation
        var methodStart = IndexOfNth(source, "PublishScanRequestAsync", 2);
        Assert.True(methodStart >= 0, "Implementation of PublishScanRequestAsync not found");

        var nextMethod = IndexOfNth(source, "PublishScanResultAsync", 2);
        Assert.True(nextMethod > methodStart, "PublishScanResultAsync impl should come after");

        var methodBody = source[methodStart..nextMethod];
        Assert.DoesNotContain("Task.Run", methodBody);
    }

    [Fact]
    public void PublishScanResultAsync_Impl_Should_Not_Use_TaskRun()
    {
        var source = ReadSourceFile();

        // 2nd occurrence = implementation
        var methodStart = IndexOfNth(source, "PublishScanResultAsync", 2);
        Assert.True(methodStart >= 0, "Implementation of PublishScanResultAsync not found");

        var nextMethod = IndexOfNth(source, "StartListeningForResults", 2);
        Assert.True(nextMethod > methodStart, "StartListeningForResults impl should come after");

        var methodBody = source[methodStart..nextMethod];
        Assert.DoesNotContain("Task.Run", methodBody);
    }

    [Fact]
    public void PublishRegion_Should_Use_SemaphoreSlim_Without_TaskRun_Wrapper()
    {
        var source = ReadSourceFile();

        // Region from impl of PublishScanRequestAsync to impl of StartListeningForResults
        var publishStart = IndexOfNth(source, "PublishScanRequestAsync", 2);
        var listenStart = IndexOfNth(source, "StartListeningForResults", 2);
        Assert.True(publishStart >= 0 && listenStart > publishStart);

        var methodRegion = source[publishStart..listenStart];

        // W4 fix: SemaphoreSlim replaces lock for async-compatible synchronization
        Assert.Contains("_channelLock", methodRegion);
        Assert.DoesNotContain("Task.Run", methodRegion);
        Assert.DoesNotContain("lock (_lock)", methodRegion);
    }
}

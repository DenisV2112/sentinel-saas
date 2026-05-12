using Xunit;

namespace Sentinel.CodeQuality.Service.Tests;

/// <summary>
/// D2: Verifies Program.cs has no duplicate DI registrations.
/// RED phase: These tests should FAIL because Program.cs currently contains:
///   - AddControllers() called twice (L6, L18)
///   - AddScoped&lt;IReportPublisher, ReportPublisher&gt;() duplicate (L8, L16)
/// </summary>
public class ProgramRegistrationTest
{
    [Fact]
    public void AddControllers_Should_Appear_Exactly_Once()
    {
        var programText = File.ReadAllText(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Program.cs"));

        var addControllersCount = CountOccurrences(programText, "AddControllers()");

        Assert.Equal(1, addControllersCount);
    }

    [Fact]
    public void IReportPublisher_Registration_Should_Appear_Exactly_Once()
    {
        var programText = File.ReadAllText(
            Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Program.cs"));

        var reportPublisherCount = CountOccurrences(programText, "IReportPublisher");

        Assert.Equal(1, reportPublisherCount);
    }

    private static int CountOccurrences(string text, string substring)
    {
        int count = 0;
        int index = 0;
        while ((index = text.IndexOf(substring, index, StringComparison.Ordinal)) != -1)
        {
            count++;
            index += substring.Length;
        }
        return count;
    }
}

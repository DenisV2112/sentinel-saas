using System.Text.Json;

namespace Sentinel.CodeQuality.Service.Models;

public class SemgrepRawOutput
{
    public List<SemgrepFinding> Results { get; set; } = new();
}

public class SemgrepFinding
{
    public string CheckId { get; set; }
    public string Path { get; set; }
    public SemgrepExtra Extra { get; set; }
}

public class SemgrepExtra
{
    public string Severity { get; set; }
    // ponytail: Semgrep metadata values pueden ser arrays/objects (cwe, references), no solo strings
    public Dictionary<string, JsonElement> Metadata { get; set; }
}

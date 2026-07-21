using Sentinel.CodeQuality.Service.Models;

namespace Sentinel.CodeQuality.Service.Services;

public class SemgrepMapper
{
    public ScanResult Map(SemgrepRawOutput raw, string scanId)
    {
        var result = new ScanResult { ScanId = scanId };

        // ponytail: null guard — JSON con "results": null rompe sin esto (.Select NPE)
        var findings = (raw.Results ?? new()).Select(r => new Finding
        {
            Rule = r.CheckId,
            File = r.Path,
            Severity = r.Extra?.Severity,
            // ponytail: JsonElement.ToString() maneja arrays/objects en metadata sin JsonException
            Description = r.Extra?.Metadata?.FirstOrDefault().Value.ToString() ?? ""
        }).ToList();

        result.Findings = findings;
        return result;
    }
}
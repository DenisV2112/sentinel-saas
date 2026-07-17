using Sentinel.CodeQuality.Service.DTOs;
using Sentinel.CodeQuality.Service.Models;

namespace Sentinel.CodeQuality.Service.Services;

public class QualityGateEvaluator
{
    public ScanFinalResultDto Evaluate(ScanResult scan)
    {
        var critical = scan.Findings.Count(f => f.Severity == "ERROR");
        var secrets = scan.Findings.Count(f => f.Rule.Contains("secret"));

        if (secrets > 0)
            return new ScanFinalResultDto(scan.ScanId, "FAIL", "Se detectaron secretos expuestos.");

        if (critical > 5)
            return new ScanFinalResultDto(scan.ScanId, "FAIL", "Demasiados hallazgos críticos.");

        return new ScanFinalResultDto(scan.ScanId, "PASS");
    }
}

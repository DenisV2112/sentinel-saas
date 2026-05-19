import { useEffect, useState } from "react";
import type { UnifiedVulnerability } from "../types/scanResults";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UseFindingsFilter {
  severity: string | null;
  status: string | null;
}

interface UseFindingsReturn {
  data: UnifiedVulnerability[];
  loading: boolean;
  error: string | null;
  filter: UseFindingsFilter;
  setFilter: (filter: Partial<UseFindingsFilter>) => void;
}

export function useFindings(): UseFindingsReturn {
  const [data, setData] = useState<UnifiedVulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<UseFindingsFilter>({
    severity: null,
    status: null,
  });

  const setFilter = (f: Partial<UseFindingsFilter>) =>
    setFilterState((prev) => ({ ...prev, ...f }));

  useEffect(() => {
    let mounted = true;

    const fetchFindings = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");

        // Step 1: Fetch all completed scans
        const scansRes = await fetch(
          `${API}/api/bff/scans?size=50&sort=createdAt,desc`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!scansRes.ok) throw new Error("Failed to load scans");
        const scansJson = await scansRes.json();
        const completedScans = (scansJson.content ?? scansJson.items ?? scansJson ?? []).filter(
          (s: any) => s.status === "COMPLETED"
        );

        // Step 2: Fetch results for each completed scan, flatten findings
        const allVulnerabilities: UnifiedVulnerability[] = [];

        for (const scan of completedScans) {
          try {
            const scanId = scan.scanId ?? scan.id;
            const resultsRes = await fetch(
              `${API}/api/bff/scans/${scanId}/results`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );
            if (!resultsRes.ok) continue;
            const resultsJson = await resultsRes.json();
            const findings: UnifiedVulnerability[] =
              resultsJson.findings ??
              resultsJson.data?.findings ??
              resultsJson.results?.findings ??
              [];

            const scanned = findings.map((f: any, idx: number) => ({
              id: f.id ?? `finding-${scanId}-${idx}`,
              title: f.title ?? f.name ?? f.alert ?? "Untitled Finding",
              severity: normalizeSeverity(f.severity ?? f.risk ?? f.Severity ?? "INFO"),
              description: f.description ?? f.Description ?? f.message ?? "",
              file: f.file ?? f.filePath ?? f.path ?? undefined,
              line: f.line ?? f.start?.line ?? undefined,
              solution: f.solution ?? f.Solution ?? f.remediation ?? undefined,
              cwe: f.cwe ?? f.cweId ?? undefined,
              cve: f.cve ?? f.cveId ?? undefined,
              package: f.package ?? f.PkgName ?? undefined,
              version: f.version ?? f.InstalledVersion ?? undefined,
              fixedVersion: f.fixedVersion ?? f.FixedVersion ?? undefined,
              url: f.url ?? f.Uri ?? undefined,
              method: f.method ?? f.Method ?? undefined,
              param: f.param ?? f.Param ?? undefined,
              code: f.code ?? undefined,
            }));

            allVulnerabilities.push(...scanned);
          } catch {
            // Skip failed per-scan result fetch; continue with remaining scans
          }
        }

        if (mounted) setData(allVulnerabilities);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFindings();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error, filter, setFilter };
}

function normalizeSeverity(
  raw: string | null | undefined
): UnifiedVulnerability["severity"] {
  if (!raw) return "INFO";
  const s = raw.toUpperCase();
  if (s === "CRITICAL") return "CRITICAL";
  if (s === "HIGH" || s === "ERROR") return "HIGH";
  if (s === "MEDIUM" || s === "WARNING") return "MEDIUM";
  if (s === "LOW") return "LOW";
  return "INFO";
}

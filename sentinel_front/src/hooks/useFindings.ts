import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UnifiedVulnerability } from "../types/scanResults";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface UseFindingsFilter {
  severity: string | null;
  status: string | null;
}

interface UseFindingsReturn {
  data: UnifiedVulnerability[] | undefined;
  findings: UnifiedVulnerability[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  filter: UseFindingsFilter;
  setFilter: (filter: Partial<UseFindingsFilter>) => void;
}

const findingsKeys = {
  all: ["findings"] as const,
  list: () => [...findingsKeys.all, "list"] as const,
};

function mapFinding(f: any, scanId: string, idx: number): UnifiedVulnerability {
  return {
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
  };
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

async function withConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (index < tasks.length) {
        const taskIndex = index++;
        results[taskIndex] = await tasks[taskIndex]();
      }
    }
  );
  await Promise.all(workers);
  return results;
}

export function useFindings(): UseFindingsReturn {
  const [filter, setFilterState] = useState<UseFindingsFilter>({
    severity: null,
    status: null,
  });

  const setFilter = (f: Partial<UseFindingsFilter>) =>
    setFilterState((prev) => ({ ...prev, ...f }));

  const query = useQuery({
    queryKey: findingsKeys.list(),
    queryFn: async (): Promise<UnifiedVulnerability[]> => {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Step 1: Fetch all completed scans
      const scansRes = await fetch(
        `${API}/api/bff/scans?size=50&sort=createdAt,desc`,
        { headers }
      );
      if (!scansRes.ok) throw new Error("Failed to load scans");
      const scansJson = await scansRes.json();
      const completedScans = (
        scansJson.content ?? scansJson.items ?? scansJson ?? []
      ).filter((s: any) => s.status === "COMPLETED");

      // Step 2: Fetch results for each completed scan (concurrency-limited to 5)
      const tasks: (() => Promise<UnifiedVulnerability[]>)[] = completedScans.map((scan: any) => {
        const scanId = scan.scanId ?? scan.id;
        return () =>
          fetch(`${API}/api/bff/scans/${scanId}/results`, { headers })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(
              (j) =>
                j.findings ??
                j.data?.findings ??
                j.results?.findings ??
                []
            )
            .then((findings: any[]) =>
              findings.map((f: any, idx: number) => mapFinding(f, scanId, idx))
            )
            .catch(() => [] as UnifiedVulnerability[]);
      });

      const results = await withConcurrencyLimit<UnifiedVulnerability[]>(tasks, 5);

      // Step 3: Flatten — failed scans already returned empty arrays
      return results.flatMap((r) => r);
    },
    staleTime: 30_000,
  });

  const data = query.data;
  const findings = data ?? [];

  return {
    data,
    findings,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    filter,
    setFilter,
  };
}

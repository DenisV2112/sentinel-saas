import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UnifiedVulnerability } from "../types/scanResults";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Scan item (returned by the scans-only refactored hook) ──
export interface ScanItem {
  id: string;
  scanId: string;
  status: string;
  projectId?: string;
  projectName?: string;
  scanType?: string;
  targetRepo?: string;
  targetUrl?: string;
  createdAt: string;
  completedAt?: string;
}

interface UseFindingsFilter {
  severity: string | null;
  status: string | null;
}

interface UseFindingsReturn {
  scans: ScanItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  filter: UseFindingsFilter;
  setFilter: (filter: Partial<UseFindingsFilter>) => void;
}

const findingsKeys = {
  all: ["findings"] as const,
  list: () => [...findingsKeys.all, "scans"] as const,
};

export function mapFinding(f: any, scanId: string, idx: number): UnifiedVulnerability {
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

export function normalizeSeverity(
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

export function useFindings(): UseFindingsReturn {
  const [filter, setFilterState] = useState<UseFindingsFilter>({
    severity: null,
    status: null,
  });

  const setFilter = (f: Partial<UseFindingsFilter>) =>
    setFilterState((prev) => ({ ...prev, ...f }));

  const query = useQuery({
    queryKey: findingsKeys.list(),
    queryFn: async (): Promise<ScanItem[]> => {
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      // Fetch scan list only — NO per-scan results
      const scansRes = await fetch(
        `${API}/api/bff/scans?size=50&sort=createdAt,desc`,
        { headers }
      );
      if (!scansRes.ok) throw new Error("Failed to load scans");
      const scansJson = await scansRes.json();
      const allScans = scansJson.content ?? scansJson.items ?? scansJson ?? [];

      // Filter to completed scans
      return (Array.isArray(allScans) ? allScans : [])
        .filter((s: any) => s.status === "COMPLETED")
        .map((s: any) => ({
          id: s.id,
          scanId: s.scanId ?? s.id,
          status: s.status,
          projectId: s.projectId,
          projectName: s.projectName,
          scanType: s.scanType,
          targetRepo: s.targetRepo,
          targetUrl: s.targetUrl,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
        }));
    },
    staleTime: 30_000,
  });

  const scans = query.data ?? [];

  return {
    scans,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    filter,
    setFilter,
  };
}

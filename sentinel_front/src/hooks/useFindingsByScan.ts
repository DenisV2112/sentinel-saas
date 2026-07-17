import { useQuery } from "@tanstack/react-query";
import type { UnifiedVulnerability } from "../types/scanResults";
import { mapFinding } from "./useFindings";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const findingsByScanKeys = {
  byScan: (scanId: string) => ["findings", "scan", scanId] as const,
};

export function useFindingsByScan(scanId: string | null, enabled = false) {
  return useQuery({
    queryKey: findingsByScanKeys.byScan(scanId ?? "null"),
    queryFn: async (): Promise<UnifiedVulnerability[]> => {
      if (!scanId) return [];
      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const res = await fetch(
        `${API}/api/bff/scans/${scanId}/results`,
        { headers }
      );
      if (!res.ok) throw new Error(`Failed to load scan results: ${res.status}`);
      const json = await res.json();
      const findings = json.findings ?? json.data?.findings ?? json.results?.findings ?? [];
      return findings.map((f: any, idx: number) => mapFinding(f, scanId, idx));
    },
    enabled: enabled && scanId != null,
    staleTime: 30_000,
  });
}

export { findingsByScanKeys };

import { useQuery } from "@tanstack/react-query";
import type { UnifiedVulnerability } from "../types/scanResults";
import { mapFinding } from "./useFindings";
import { API, fetchJSON } from "../api/fetch-helpers";

const findingsByScanKeys = {
  byScan: (scanId: string) => ["findings", "scan", scanId] as const,
};

export function useFindingsByScan(scanId: string | null, enabled = false) {
  return useQuery({
    queryKey: findingsByScanKeys.byScan(scanId ?? "null"),
    queryFn: async (): Promise<UnifiedVulnerability[]> => {
      if (!scanId) return [];
      const json = await fetchJSON<any>(`${API}/api/bff/scans/${scanId}/results`);
      const findings = json.findings ?? json.data?.findings ?? json.results?.findings ?? [];
      return findings.map((f: any, idx: number) => mapFinding(f, scanId, idx));
    },
    enabled: enabled && scanId != null,
    staleTime: 30_000,
  });
}

export { findingsByScanKeys };

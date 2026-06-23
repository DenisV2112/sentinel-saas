import { useQuery } from "@tanstack/react-query";
import { API, getAuthHeaders } from "../api/fetch-helpers";

/* ======================================================
   QUERY KEYS
====================================================== */
export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
  activeScans: () => [...dashboardKeys.all, "activeScans"] as const,
  recentScans: (limit: number) => [...dashboardKeys.all, "recentScans", limit] as const,
  trends: (range: string) => [...dashboardKeys.all, "trends", range] as const,
  riskProjects: () => [...dashboardKeys.all, "riskProjects"] as const,
  notifications: () => [...dashboardKeys.all, "notifications"] as const,
};

/* ======================================================
   FETCHERS
====================================================== */

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

/* ======================================================
   TYPES
====================================================== */

export interface DashboardSummary {
  exposedPorts?: number;
  criticalFindingsOpen?: number;
  qualityGatePassRate?: number;
  projectsMonitored: number;
}

export interface DashboardData {
  tenants: any[];
  projects: any[];
  recentScans: any[];
  stats: {
    totalTenants: number;
    totalProjects: number;
    totalScans: number;
  };
}

export interface ActiveScan {
  scanId: string;
  projectName: string;
  scanType: string;
  status: string;
  statusMessage: string;
  elapsedTime: string;
}

export interface VulnerabilityTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface RecentScan {
  scanId: string;
  projectName: string;
  scanType: string;
  status: string;
  qualityGatePassed: boolean;
  completedAt: string;
}

export interface TopRiskProject {
  project: string;
  critical: number;
  high: number;
}

export interface DashboardNotification {
  id: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  createdAt: string;
}

/* ======================================================
   HOOKS
====================================================== */

/** Dashboard summary (KPIs) — polls every 60s */
export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async (): Promise<DashboardSummary | null> => {
      const json: DashboardData = await fetchJSON(`${API}/api/bff/dashboard`);
      const scans = json.recentScans ?? [];
      const completedScans = scans.filter((s: any) => s.status === "COMPLETED");
      const passedScans = completedScans.filter(
        (s: any) => s.qualityGatePassed || s.qualityGate === "PASS"
      );
      return {
        exposedPorts: undefined,
        criticalFindingsOpen: undefined,
        qualityGatePassRate:
          completedScans.length > 0
            ? Math.round((passedScans.length / completedScans.length) * 100)
            : undefined,
        projectsMonitored: json.stats?.totalProjects ?? json.projects?.length ?? 0,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** Active (RUNNING) scans — polls every 30s */
export function useActiveScans() {
  return useQuery({
    queryKey: dashboardKeys.activeScans(),
    queryFn: async (): Promise<ActiveScan[]> => {
      const json = await fetchJSON<any>(`${API}/api/bff/scans?status=RUNNING`);
      const scans = (json.content ?? json ?? []).map((scan: any) => ({
        scanId: scan.scanId ?? scan.id,
        projectName: scan.projectName ?? scan.project ?? "Unknown",
        scanType: scan.type ?? scan.scanType ?? "SAST",
        status: scan.status ?? "Running",
        statusMessage: scan.message ?? "Scanning...",
        elapsedTime: scan.elapsedTime ?? "--:--",
      }));
      return scans;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Vulnerability trends — refetches when range changes */
export function useVulnerabilityTrends(range: "7d" | "30d" | "90d" = "30d") {
  return useQuery({
    queryKey: dashboardKeys.trends(range),
    queryFn: async (): Promise<VulnerabilityTrend[]> => {
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const json = await fetchJSON<any>(`${API}/api/bff/analytics/vulnerabilities?days=${days}`);
      return json.data ?? json;
    },
    staleTime: 60_000,
  });
}

/** Recent scans — refetches when limit changes */
export function useRecentScans(limit = 5) {
  return useQuery({
    queryKey: dashboardKeys.recentScans(limit),
    queryFn: async (): Promise<RecentScan[]> => {
      const json = await fetchJSON<any>(
        `${API}/api/bff/scans?size=${limit}&sort=createdAt,desc`
      );
      const scans = (json.content ?? json.items ?? json ?? []).map((scan: any) => ({
        scanId: scan.scanId ?? scan.id,
        projectName: scan.projectName ?? scan.project ?? "Unknown",
        scanType: scan.type ?? scan.scanType ?? "SAST",
        status: scan.status ?? "COMPLETED",
        qualityGatePassed: scan.qualityGatePassed ?? scan.qualityGate === "PASS",
        completedAt: scan.completedAt ?? scan.createdAt,
      }));
      return scans;
    },
    staleTime: 30_000,
  });
}

/** Top risk projects (aggregated client-side) */
export function useTopRiskProjects() {
  return useQuery({
    queryKey: dashboardKeys.riskProjects(),
    queryFn: async (): Promise<TopRiskProject[]> => {
      const json = await fetchJSON<any>(
        `${API}/api/bff/scans?size=100&sort=createdAt,desc`
      );
      const scans = json.content ?? json.items ?? json ?? [];
      const projectRisk: Record<string, TopRiskProject> = {};
      for (const scan of scans) {
        if (scan.status !== "COMPLETED") continue;
        const projectName = scan.projectName ?? scan.project ?? "Unknown";
        if (!projectRisk[projectName]) {
          projectRisk[projectName] = { project: projectName, critical: 0, high: 0 };
        }
        if (scan.criticalCount) projectRisk[projectName].critical += Number(scan.criticalCount);
        if (scan.highCount) projectRisk[projectName].high += Number(scan.highCount);
      }
      return Object.values(projectRisk)
        .sort((a, b) => b.critical * 2 + b.high - (a.critical * 2 + a.high))
        .slice(0, 5);
    },
    staleTime: 60_000,
  });
}

/** Dashboard notifications — polls every 20s */
export function useDashboardNotifications() {
  return useQuery({
    queryKey: dashboardKeys.notifications(),
    queryFn: () => fetchJSON<DashboardNotification[]>(`${API}/api/bff/notifications?type=dashboard`),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });
}

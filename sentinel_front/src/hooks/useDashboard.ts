import { useEffect, useState } from "react";
import { API, getAuthHeaders } from "../api/fetch-helpers";

/* ======================================================
   COMMON
====================================================== */

type ApiState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

/* ======================================================
   DASHBOARD SUMMARY (KPIs)
====================================================== */

export interface DashboardSummary {
  exposedPorts?: number;          // Requires BFF to aggregate from results-aggregator (DAST/Container scan findings)
  criticalFindingsOpen?: number;  // Requires BFF to aggregate from results-aggregator (vulnerability counts by status)
  qualityGatePassRate?: number;   // Calculated client-side from recentScans until BFF provides it
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

export function useDashboardSummary(): ApiState<DashboardSummary | null> {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/bff/dashboard`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load dashboard summary");
        const json: DashboardData = await res.json();

        // Transform BFF response to dashboard summary format
        if (mounted) {
          const scans = json.recentScans ?? [];
          const completedScans = scans.filter((s: any) => s.status === 'COMPLETED');
          const passedScans = completedScans.filter(
            (s: any) => s.qualityGatePassed || s.qualityGate === 'PASS'
          );

          setData({
            // Requires BFF enhancement to include from results-aggregator
            exposedPorts: undefined,
            criticalFindingsOpen: undefined,
            // Derived client-side from available recentScans data
            qualityGatePassRate: completedScans.length > 0
              ? Math.round((passedScans.length / completedScans.length) * 100)
              : undefined,
            projectsMonitored: json.stats?.totalProjects ?? json.projects?.length ?? 0,
          });
        }
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}

/* ======================================================
   ACTIVE SCANS
====================================================== */

export interface ActiveScan {
  scanId: string;
  projectName: string;
  scanType: string;
  status: string;
  statusMessage: string;
  elapsedTime: string;
}

export function useActiveScans(): ApiState<ActiveScan[]> {
  const [data, setData] = useState<ActiveScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchActiveScans = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API}/api/bff/scans?status=RUNNING`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load active scans");
        const json = await res.json();
        // Transform to expected format
        const scans = (json.content ?? json ?? []).map((scan: any) => ({
          scanId: scan.scanId ?? scan.id,
          projectName: scan.projectName ?? scan.project ?? "Unknown",
          scanType: scan.type ?? scan.scanType ?? "SAST",
          status: scan.status ?? "Running",
          statusMessage: scan.message ?? "Scanning...",
          elapsedTime: scan.elapsedTime ?? "--:--",
        }));
        if (mounted) setData(scans);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchActiveScans();
    const interval = setInterval(fetchActiveScans, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}

/* ======================================================
   VULNERABILITY TRENDS
====================================================== */

export interface VulnerabilityTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function useVulnerabilityTrends(
  range: "7d" | "30d" | "90d" = "30d"
): ApiState<VulnerabilityTrend[]> {
  const [data, setData] = useState<VulnerabilityTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchTrends = async () => {
      try {
        setLoading(true);
        const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
        const res = await fetch(
          `${API}/api/bff/analytics/vulnerabilities?days=${days}`
        );
        if (!res.ok) throw new Error("Failed to load vulnerability trends");
        const json = await res.json();
        if (mounted) setData(json.data ?? json);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTrends();

    return () => {
      mounted = false;
    };
  }, [range]);

  return { data, loading, error };
}

/* ======================================================
   RECENT SCANS
====================================================== */

export interface RecentScan {
  scanId: string;
  projectName: string;
  scanType: string;
  status: string;
  qualityGatePassed: boolean;
  completedAt: string;
}

export function useRecentScans(limit = 5): ApiState<RecentScan[]> {
  const [data, setData] = useState<RecentScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchRecentScans = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API}/api/bff/scans?size=${limit}&sort=createdAt,desc`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (!res.ok) throw new Error("Failed to load recent scans");
        const json = await res.json();
        // Transform to expected format
        const scans = (json.content ?? json.items ?? json ?? []).map((scan: any) => ({
          scanId: scan.scanId ?? scan.id,
          projectName: scan.projectName ?? scan.project ?? "Unknown",
          scanType: scan.type ?? scan.scanType ?? "SAST",
          status: scan.status ?? "COMPLETED",
          qualityGatePassed: scan.qualityGatePassed ?? scan.qualityGate === "PASS",
          completedAt: scan.completedAt ?? scan.createdAt,
        }));
        if (mounted) setData(scans);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRecentScans();

    return () => {
      mounted = false;
    };
  }, [limit]);

  return { data, loading, error };
}

/* ======================================================
   TOP RISK PROJECTS
====================================================== */

export interface TopRiskProject {
  project: string;
  critical: number;
  high: number;
}

export function useTopRiskProjects(): ApiState<TopRiskProject[]> {
  const [data, setData] = useState<TopRiskProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchTopRisk = async () => {
      try {
        setLoading(true);
        // Compute client-side from scan results rather than depending on backend endpoint
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${API}/api/bff/scans?size=100&sort=createdAt,desc`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error("Failed to load scans for risk analysis");
        const json = await res.json();
        const scans = json.content ?? json.items ?? json ?? [];

        // Aggregate risk by project from completed scans with findings
        const projectRisk: Record<string, { project: string; critical: number; high: number }> = {};

        for (const scan of scans) {
          if (scan.status !== "COMPLETED") continue;
          const projectName = scan.projectName ?? scan.project ?? "Unknown";
          if (!projectRisk[projectName]) {
            projectRisk[projectName] = { project: projectName, critical: 0, high: 0 };
          }
          // Count from scan-level severity counts if available
          if (scan.criticalCount) projectRisk[projectName].critical += Number(scan.criticalCount);
          if (scan.highCount) projectRisk[projectName].high += Number(scan.highCount);
        }

        // Sort by (critical * 2 + high) descending, take top 5
        const ranked = Object.values(projectRisk)
          .sort((a, b) => (b.critical * 2 + b.high) - (a.critical * 2 + a.high))
          .slice(0, 5);

        if (mounted) setData(ranked);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTopRisk();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, loading, error };
}

/* ======================================================
   NOTIFICATIONS
====================================================== */

export interface DashboardNotification {
  id: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  createdAt: string;
}

export function useDashboardNotifications(): ApiState<
  DashboardNotification[]
> {
  const [data, setData] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API}/api/bff/notifications?type=dashboard`
        );
        if (!res.ok) throw new Error("Failed to load notifications");
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}

import { motion } from "framer-motion";
import Sidebar from "@/components/commons/Sidebar";
import {
  Activity,
  AlertTriangle,
  ShieldCheck,
  Layers,
} from "lucide-react";
import {
  useDashboardSummary,
  useActiveScans,
  useVulnerabilityTrends,
  useRecentScans,
  useTopRiskProjects,
} from "@hooks/useDashboard";
import { DashboardHeader } from "./DashboardHeader";
import { KpiCard } from "./KpiCard";
import { VulnerabilityChart } from "./VulnerabilityChart";
import { RecentScansTable } from "./RecentScansTable";
import { ActiveScansList } from "./ActiveScansList";
import { TopRiskProjects } from "./TopRiskProjects";

const appStyle = { background: "var(--color-background)" } as const;

export default function DashboardContainer() {
  const {
    data: summary,
    isLoading: summaryLoading,
  } = useDashboardSummary();
  const {
    data: activeScans,
    isLoading: activeLoading,
    isError: activeError,
    refetch: refetchActive,
  } = useActiveScans();
  const {
    data: recentScans,
    isLoading: recentLoading,
    isError: recentError,
    refetch: refetchRecent,
  } = useRecentScans();
  const {
    data: riskProjects,
    isLoading: riskLoading,
    isError: riskError,
    refetch: refetchRisk,
  } = useTopRiskProjects();
  const {
    data: trends,
    isLoading: trendsLoading,
    isError: trendsError,
    refetch: refetchTrends,
  } = useVulnerabilityTrends("30d");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="app" style={appStyle}>
        <Sidebar />
        <main className="main">
          <DashboardHeader />
          <section className="content">
            <div className="kpis">
              <KpiCard
                title="Exposed Ports"
                value={summary?.exposedPorts ?? 0}
                icon={Activity}
                isLoading={summaryLoading}
              />
              <KpiCard
                title="Critical Findings"
                value={summary?.criticalFindingsOpen ?? 0}
                icon={AlertTriangle}
                danger={true}
                isLoading={summaryLoading}
              />
              <KpiCard
                title="Quality Gate Pass"
                value={`${summary?.qualityGatePassRate ?? 0}%`}
                icon={ShieldCheck}
                isLoading={summaryLoading}
              />
              <KpiCard
                title="Projects Monitored"
                value={summary?.projectsMonitored ?? 0}
                icon={Layers}
                isLoading={summaryLoading}
              />
            </div>

            <div className="dashboard-grid">
              <div className="left">
                  <VulnerabilityChart
                    trends={trends ?? []}
                    isLoading={trendsLoading}
                    isError={trendsError}
                    onRetry={() => refetchTrends()}
                  />
                  <RecentScansTable
                    scans={recentScans ?? []}
                    isLoading={recentLoading}
                    isError={recentError}
                    onRetry={() => refetchRecent()}
                  />
              </div>
              <div className="right">
                  <ActiveScansList
                    scans={activeScans ?? []}
                    isLoading={activeLoading}
                    isError={activeError}
                    onRetry={() => refetchActive()}
                  />
                  <TopRiskProjects
                    projects={riskProjects ?? []}
                    isLoading={riskLoading}
                    isError={riskError}
                    onRetry={() => refetchRisk()}
                  />
              </div>
            </div>
          </section>
        </main>
      </div>
    </motion.div>
  );
}

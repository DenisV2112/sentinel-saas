import React from "react";
import Sidebar from "@/components/commons/Sidebar";
import {
  ShieldCheck,
  LayoutDashboard,
  Radar,
  Folder,
  Bug,
  Bell,
  Settings,
  Activity,
  AlertTriangle,
  Layers,
  TrendingUp,
  Clock,
  PlayCircle,
  Flame,
  Search,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { CardSkeleton } from "@/components/commons/skeletons/CardSkeleton";
import { TableSkeleton } from "@/components/commons/skeletons/TableSkeleton";

import {
  useDashboardSummary,
  useActiveScans,
  useVulnerabilityTrends,
  useRecentScans,
  useTopRiskProjects,
} from "@hooks/useDashboard";

/* Static style objects — use CSS vars so they're theme-aware without per-render dependency */
const cardStyle = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
} as const;

const headerStyle = {
  background: 'var(--color-surface)',
  borderBottom: '1px solid var(--color-border)',
} as const;

const appStyle = { background: 'var(--color-background)' } as const;

/* ========================================================= */
/* ====================== DASHBOARD ======================== */
/* ========================================================= */

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: activeScans, isLoading: activeScansLoading } = useActiveScans();
  const { data: recentScans, isLoading: recentScansLoading } = useRecentScans();
  const { data: riskProjects, isLoading: riskLoading } = useTopRiskProjects();
  const { data: trends, isLoading: trendsLoading } = useVulnerabilityTrends("30d");

  const isLoading = summaryLoading || activeScansLoading || recentScansLoading || riskLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="app" style={appStyle}>
        {/* ================= SIDEBAR ================= */}
        <Sidebar />

        {/* ================= MAIN ================= */}
        <main className="main">
          {/* HEADER */}
          <header
            className="header"
            style={headerStyle}
          >
            <h1 style={{ color: 'var(--color-text-primary)' }}>Overview</h1>

            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 12,
                  transform: "translateY(-50%)",
                  color: 'var(--color-text-tertiary)',
                }}
              />
              <input
                placeholder="Search IPs, CVEs, or Projects..."
                style={{
                  paddingLeft: 36,
                  background: 'var(--color-background)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </header>

          {/* ================= CONTENT ================= */}
          <section className="content">
            {isLoading ? (
              <>
                {/* KPI Skeletons */}
                <div className="kpis">
                  <CardSkeleton count={4} />
                </div>
                {/* Table Skeleton for recent scans */}
                <div style={{ marginTop: 24 }}>
                  <TableSkeleton columns={5} rows={4} />
                </div>
              </>
            ) : (
              <>
          {/* ================= KPIs ================= */}
          <div className="kpis">
            <Kpi
              title="Exposed Ports"
              value={summary?.exposedPorts ?? 0}
              icon={Activity}
            />

            <Kpi
              title="Critical Findings"
              value={summary?.criticalFindingsOpen ?? 0}
              icon={AlertTriangle}
            />

            <Kpi
              title="Quality Gate Pass"
              value={`${summary?.qualityGatePassRate ?? 0}%`}
              icon={ShieldCheck}
            />

            <Kpi
              title="Projects Monitored"
              value={summary?.projectsMonitored ?? 0}
              icon={Layers}
            />
          </div>

          {/* ================= GRID ================= */}
          <div className="dashboard-grid">
            {/* ============ LEFT ============ */}
            <div className="left">
              {/* Trends */}
              <section
                className="card"
                style={cardStyle}
              >
                <div className="card-header">
                  <div>
                    <h3
                      style={{
                        display: "flex",
                        gap: 8,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      <TrendingUp size={18} />
                      Vulnerability Trends
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                      Last 30 Days Overview
                    </p>
                  </div>
                </div>

                <div
                  className="chart"
                  style={{
                    height: 180,
                    background: 'var(--color-background)',
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 8,
                    padding: "12px 16px",
                    color: 'var(--color-text-tertiary)',
                  }}
                >
                  {trendsLoading ? (
                    <span>Loading...</span>
                  ) : !trends || trends.length === 0 ? (
                    <span>No data available</span>
                  ) : (
                    trends.map((t, i) => {
                      const maxVal = Math.max(
                        trends.reduce(
                          (m, x) =>
                            Math.max(
                              m,
                              x.critical + x.high + x.medium + x.low
                            ),
                          0
                        ),
                        1
                      );
                      const barHeight = ((t.critical + t.high + t.medium + t.low) / maxVal) * 120;
                      return (
                        <div
                          key={t.date ?? i}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column-reverse",
                              width: "100%",
                              maxWidth: 32,
                              height: 120,
                              gap: 1,
                            }}
                          >
                            <div
                              style={{
                                height: `${((t.low / maxVal) * 120) || 0}px`,
                                background: 'var(--color-info)',
                                borderRadius: "2px 2px 0 0",
                              }}
                            />
                            <div
                              style={{
                                height: `${((t.medium / maxVal) * 120) || 0}px`,
                                background: 'var(--color-warning)',
                                borderRadius: "2px 2px 0 0",
                              }}
                            />
                            <div
                              style={{
                                height: `${((t.high / maxVal) * 120) || 0}px`,
                                background: 'var(--color-danger)',
                                borderRadius: "2px 2px 0 0",
                              }}
                            />
                            <div
                              style={{
                                height: `${((t.critical / maxVal) * 120) || 0}px`,
                                background: 'var(--color-severity-critical)',
                                borderRadius: "2px 2px 0 0",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 10 }}>
                            {t.date ? t.date.slice(5) : ""}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Recent Scans */}
              <section
                className="card"
                style={cardStyle}
              >
                <div className="card-header">
                  <h3
                    style={{
                      display: "flex",
                      gap: 8,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <Clock size={18} />
                    Recent Scans
                  </h3>
                </div>

                <table>
                  <thead>
                    <tr>
                      {["Project", "Type", "Status", "Quality Gate", ""].map(
                        (h) => (
                          <th
                            key={h}
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {(recentScans ?? []).map((scan) => (
                      <tr key={scan.scanId}>
                        <td style={{ color: 'var(--color-text-primary)' }}>
                          {scan.projectName}
                        </td>
                        <td>
                          <span className="tag">{scan.scanType}</span>
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)' }}>
                          {scan.status}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: scan.qualityGatePassed
                                ? 'var(--color-success)'
                                : 'var(--color-danger)',
                              color: 'var(--color-on-primary)',
                            }}
                          >
                            {scan.qualityGatePassed ? "PASS" : "FAIL"}
                          </span>
                        </td>
                        <td>
                          <button className="btn-sm">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>

            {/* ============ RIGHT ============ */}
            <div className="right">
              {/* Active Scans */}
              <section
                className="card"
                style={cardStyle}
              >
                <h3
                  style={{
                    display: "flex",
                    gap: 8,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <PlayCircle size={18} />
                  Active Scans
                </h3>

                <ul className="scans">
                  {(activeScans ?? []).map((scan) => (
                    <li key={scan.scanId}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <strong style={{ color: 'var(--color-text-primary)' }}>
                          {scan.projectName}
                        </strong>

                        <span className="tag" style={{ alignSelf: "flex-start" }}>
                          {scan.scanType}
                        </span>

                        <p style={{ color: 'var(--color-text-secondary)' }}>
                          {scan.statusMessage ?? "Scanning..."}
                        </p>
                      </div>

                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {scan.elapsedTime ?? "--:--"}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  className="btn-outline"
                  style={{
                    borderColor: 'var(--color-primary)',
                    color: 'var(--color-primary)',
                  }}
                >
                  + Start New Scan
                </button>
              </section>

              {/* Top Risk Projects */}
              <section
                className="card"
                style={cardStyle}
              >
                <h3
                  style={{
                    display: "flex",
                    gap: 8,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <Flame size={18} />
                  Top Risk Projects
                </h3>

                <ul className="risk">
                  {(riskProjects ?? []).map((project) => {
                    const isSafe =
                      project.critical === 0 &&
                      project.high === 0;

                    return (
                      <li key={project.project}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {isSafe ? (
                            <ShieldCheck
                              size={16}
                              color={'var(--color-success)'}
                            />
                          ) : project.critical > 0 ? (
                            <Flame size={16} color={'var(--color-danger)'} />
                          ) : (
                            <AlertTriangle
                              size={16}
                              color={'var(--color-warning)'}
                            />
                          )}

                          <strong style={{ color: 'var(--color-text-primary)' }}>
                            {project.project}
                          </strong>
                        </div>

                        <div style={{ marginTop: 6 }}>
                          {isSafe ? (
                            <div style={{ color: 'var(--color-success)' }}>
                              Safe
                            </div>
                          ) : (
                            <>
                              <div style={{ color: 'var(--color-danger)' }}>
                                {project.critical} Critical
                              </div>
                              <div style={{ color: 'var(--color-warning)' }}>
                                {project.high} High
                              </div>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          </div>
              </>
            )}
          </section>
          </main>
      </div>
    </motion.div>
  );
}

/* ========================================================= */
/* ======================== KPI ============================ */
/* ========================================================= */

function Kpi({
  title,
  value,
  icon: Icon,
  danger = false,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  danger?: boolean;
}) {
  return (
    <div
      className="kpi"
      style={{
        background: 'var(--color-surface)',
        borderColor: danger
          ? 'var(--color-danger)'
          : 'var(--color-border)',
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      <Icon
        size={28}
        color={danger ? 'var(--color-danger)' : 'var(--color-primary)'}
      />
      <div>
        <p style={{ color: 'var(--color-text-secondary)' }}>{title}</p>
        <h3
          style={{
            color: danger
              ? 'var(--color-danger)'
              : 'var(--color-text-primary)',
          }}
        >
          {value}
        </h3>
      </div>
    </div>
  );
}
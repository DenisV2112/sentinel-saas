import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/commons/Sidebar";
import { useTheme } from "@/utils/store/themeContext";
import {
  Bell,
  CirclePlus,
  Info,
  Search,
  Calendar,
  ListFilter,
  CircleX,
  RotateCcw,
  CheckCircle,
  CircleAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useActiveScans, useRecentScans } from "@hooks/useDashboard";
import { useProjects } from "@hooks/useProjects";
import { useScans } from "@hooks/useScans";

/* ─── Helpers ──────────────────────────────────────────── */

function computeChartData(recentScans: any[]) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const days: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      day: dayNames[d.getDay()],
      dateStr: d.toISOString().slice(0, 10),
      sast: 0,
      dast: 0,
      sca: 0,
      container: 0,
    });
  }

  (recentScans ?? []).forEach((scan: any) => {
    if (!scan.completedAt) return;
    const dateStr = scan.completedAt.slice(0, 10);
    const dayEntry = days.find((d) => d.dateStr === dateStr);
    if (!dayEntry) return;
    const type = (scan.scanType ?? "").toLowerCase();
    if (type === "sast") dayEntry.sast++;
    else if (type === "dast") dayEntry.dast++;
    else if (type === "sca") dayEntry.sca++;
    else if (type === "container") dayEntry.container++;
  });

  return days;
}

/* ─── Component ────────────────────────────────────────── */

export default function ScansPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showNewScan, setShowNewScan] = useState(false);
  const [scanForm, setScanForm] = useState({
    projectId: "",
    scanType: "SAST",
    targetRepo: "",
    targetUrl: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const tenantId = localStorage.getItem("tenantId");
  const {
    data: activeScansData,
    loading: activeLoading,
    error: activeError,
  } = useActiveScans();
  const {
    data: recentScansData,
    loading: recentLoading,
    error: recentError,
  } = useRecentScans(10);
  const { projects, projectsMap } = useProjects(tenantId);
  const { startScan, getScan, refetchScans } = useScans();

  const isLoading = activeLoading || recentLoading;
  const combinedError = activeError || recentError;

  /* ── map API data to table rows ── */
  const activeRows = ((activeScansData) ?? []).map((s) => ({
    id: s.scanId,
    project: s.projectName,
    type: s.scanType,
    time: "Running",
    duration: s.elapsedTime ?? "--:--",
    status: "RUNNING" as const,
    progress: 0,
  }));

  const recentRows = ((recentScansData) ?? []).map((s) => ({
    id: s.scanId,
    project: projectsMap.get(s.projectId)?.name ?? s.projectName ?? "—",
    type: s.scanType,
    time: s.completedAt
      ? new Date(s.completedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "N/A",
    duration: s.status === "FAILED" ? "Failed" : "Completed",
    status: s.status === "FAILED" ? ("FAILED" as const) : ("COMPLETED" as const),
    progress: undefined as number | undefined,
    qualityGatePassed: s.qualityGatePassed,
    findings: undefined as { critical: number; high: number; medium: number } | undefined,
    error: s.status === "FAILED" ? "Scan Failed" : undefined,
  }));

  const scans = [...activeRows, ...recentRows];

  /* ── chart data ── */
  const chartData = computeChartData(recentScansData ?? []);

  /* ── stats ── */
  const today = new Date().toISOString().slice(0, 10);
  const scansToday =
    ((recentScansData) ?? []).filter((s) =>
      s.completedAt?.startsWith(today)
    ).length + ((activeScansData) ?? []).length;
  const failedCount = ((recentScansData) ?? []).filter(
    (s) => s.status === "FAILED"
  ).length;

  /* ── handlers ── */
  const handleNewScan = async () => {
    setFormError(null);
    if (!scanForm.projectId) {
      setFormError("Please select a project");
      return;
    }
    try {
      await startScan(
        {
          projectId: scanForm.projectId,
          scanType: scanForm.scanType,
          targetRepo: scanForm.targetRepo || undefined,
          targetUrl: scanForm.targetUrl || undefined,
        },
        tenantId || ""
      );
      refetchScans();
      setShowNewScan(false);
      setScanForm({
        projectId: "",
        scanType: "SAST",
        targetRepo: "",
        targetUrl: "",
      });
    } catch (e: any) {
      setFormError(e.message || "Failed to start scan");
    }
  };

  const handleViewReport = async (scanId: string) => {
    navigate(`/scans/${scanId}`);
  };

  return (
    <div className="scans-layout">
      <Sidebar activeItem="scans" />

      <main
        className="scans-main"
        style={{ background: theme.colors.surface }}
      >
        {/* HEADER */}
        <header
          className="scans-header"
          style={{
            background: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <h1 style={{ color: theme.colors.text.primary }}>
            Scan Management
          </h1>

          <div className="header-actions">
            <button
              className="primary-btn"
              style={{
                background: theme.colors.primary,
                color: theme.colors.onPrimary,
              }}
              onClick={() => setShowNewScan(!showNewScan)}
            >
              <CirclePlus size={18} />
              New Scan
            </button>

            <button className="icon-btn">
              <Bell size={18} />
            </button>

            <button className="icon-btn">
              <Info size={18} />
            </button>
          </div>
        </header>

        {/* NEW SCAN INLINE FORM */}
        {showNewScan && (
          <div
            style={{
              margin: "20px 20px 0",
              padding: 20,
              borderRadius: 16,
              background: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3 style={{ color: theme.colors.text.primary, fontSize: 16 }}>
              Start New Scan
            </h3>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <select
                value={scanForm.projectId}
                onChange={(e) =>
                  setScanForm({ ...scanForm, projectId: e.target.value })
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.surface,
                  color: theme.colors.text.primary,
                }}
              >
                <option value="">Select Project</option>
                {(projects ?? []).map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={scanForm.scanType}
                onChange={(e) =>
                  setScanForm({ ...scanForm, scanType: e.target.value })
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.surface,
                  color: theme.colors.text.primary,
                }}
              >
                <option value="SAST">SAST</option>
                <option value="DAST">DAST</option>
                <option value="SCA">SCA</option>
                <option value="CONTAINER">CONTAINER</option>
              </select>

              <input
                placeholder="Target Repo URL"
                value={scanForm.targetRepo}
                onChange={(e) =>
                  setScanForm({ ...scanForm, targetRepo: e.target.value })
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.surface,
                  color: theme.colors.text.primary,
                  flex: 1,
                  minWidth: 200,
                }}
              />

              <input
                placeholder="Target URL (optional)"
                value={scanForm.targetUrl}
                onChange={(e) =>
                  setScanForm({ ...scanForm, targetUrl: e.target.value })
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.surface,
                  color: theme.colors.text.primary,
                  flex: 1,
                  minWidth: 200,
                }}
              />
            </div>

            {!scanForm.projectId && (
              <span style={{ color: theme.colors.text.secondary, fontSize: 13 }}>
                Select a project first
              </span>
            )}

            {formError && (
              <span style={{ color: theme.colors.danger, fontSize: 13 }}>
                {formError}
              </span>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="primary-btn"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.onPrimary,
                  opacity: !scanForm.projectId ? 0.5 : 1,
                  cursor: !scanForm.projectId ? "not-allowed" : "pointer",
                }}
                onClick={handleNewScan}
                disabled={!scanForm.projectId}
              >
                Start New Scan
              </button>
              <button
                className="filter-btn"
                onClick={() => {
                  setShowNewScan(false);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* LOADING / ERROR STATES */}
        {isLoading && (
          <div style={{ padding: 20, color: theme.colors.text.secondary }}>
            Loading scans...
          </div>
        )}

        {combinedError && !isLoading && (
          <div
            style={{
              margin: 20,
              padding: "12px 20px",
              borderRadius: 12,
              background: theme.colors.danger,
              color: theme.colors.onPrimary || "#fff",
              fontSize: 14,
            }}
          >
            {combinedError}
          </div>
        )}

        {/* OVERVIEW */}
        <div className="scan-overview">
          {/* Scan Volume Chart */}
          <div className="scan-volume-card">
            <div className="scan-volume-header">
              <div>
                <h3>Scan Volume</h3>
                <span>Scans initiated over last 7 days</span>
              </div>

              <div className="legend">
                <span>
                  <i className="dot sast" /> SAST
                </span>
                <span>
                  <i className="dot dast" /> DAST
                </span>
                <span>
                  <i
                    className="dot"
                    style={{ background: "#ea580c" }}
                  />{" "}
                  SCA
                </span>
                <span>
                  <i
                    className="dot"
                    style={{ background: "#059669" }}
                  />{" "}
                  CONTAINER
                </span>
              </div>
            </div>

            <div className="chart">
              {(chartData ?? []).map((d) => (
                <div key={d.day} className="bar-group">
                  <div className="bar">
                    <span
                      className="bar-sast"
                      style={{ height: `${d.sast * 10}px` }}
                    />
                    <span
                      className="bar-dast"
                      style={{ height: `${d.dast * 10}px` }}
                    />
                    <span
                      style={{
                        height: `${d.sca * 10}px`,
                        background: "#ea580c",
                        borderRadius: 6,
                      }}
                    />
                    <span
                      style={{
                        height: `${d.container * 10}px`,
                        background: "#059669",
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <span className="bar-label">{d.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Side Stats */}
          <div className="scan-stats">
            <div className="stat-card">
              <span className="stat-title">Scans Today</span>
              <strong className="stat-value">{scansToday}</strong>
              <span className="stat-sub">Active</span>
            </div>

            <div className="stat-card">
              <span className="stat-title">Running</span>
              <strong className="stat-value">
                {(activeScansData ?? []).length}
              </strong>
              <span className="stat-sub">In Progress</span>
            </div>

            <div className="stat-card">
              <span className="stat-title">Failed</span>
              <strong className="stat-value danger">{failedCount}</strong>
              <span className="stat-sub">Requires Review</span>
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <section
          className="filters"
          style={{
            background: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <div className="search">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scan or project"
              style={{
                background: theme.colors.background,
                color: theme.colors.text.primary,
              }}
            />
          </div>

          <button className="filter-btn">
            <Calendar size={16} /> Last 30 days
          </button>

          <button className="filter-btn">
            <ListFilter size={16} /> More
          </button>
        </section>

        {/* TABLE */}
        <section
          className="table-wrapper"
          style={{
            background: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Scan Details</th>
                <th>Type</th>
                <th>Timeline</th>
                <th>Status</th>
                <th>Findings Summary</th>
                <th align="right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {(scans ?? []).map((scan) => (
                <tr key={scan.id}>
                  {/* SCAN DETAILS */}
                  <td>
                    <strong>{scan.project}</strong>
                    <span className="muted">ID: {scan.id}</span>
                  </td>

                  {/* TYPE */}
                  <td>
                    <span className={`tag tag-${(scan.type ?? "").toLowerCase()}`}>
                      {scan.type}
                    </span>
                  </td>

                  {/* TIMELINE */}
                  <td>
                    <span>{scan.time}</span>
                    <span className="muted">{scan.duration}</span>
                  </td>

                  {/* STATUS */}
                  <td>
                    {scan.status === "RUNNING" && (
                      <div className="status running">
                        <span className="status-dot" />
                        RUNNING
                        <div className="progress">
                          <span style={{ width: `${scan.progress ?? 0}%` }} />
                        </div>
                      </div>
                    )}

                    {scan.status === "COMPLETED" && (
                      <div className="status success">
                        <CheckCircle size={14} />
                        COMPLETED
                      </div>
                    )}

                    {scan.status === "FAILED" && (
                      <div className="status danger">
                        <CircleAlert size={14} />
                        FAILED
                      </div>
                    )}
                  </td>

                  {/* FINDINGS */}
                  <td>
                    {scan.status === "RUNNING" && (
                      <span className="muted">Analysis in progress...</span>
                    )}

                    {scan.status === "COMPLETED" && scan.findings && (
                      <div className="findings">
                        <span className="dot critical" /> {scan.findings.critical}
                        <span className="dot high" /> {scan.findings.high}
                        <span className="dot medium" /> {scan.findings.medium}
                      </div>
                    )}

                    {scan.status === "COMPLETED" && !scan.findings && (
                      <span className="muted">
                        {scan.qualityGatePassed ? "Quality Gate: PASS" : "Quality Gate: FAIL"}
                      </span>
                    )}

                    {scan.status === "FAILED" && (
                      <span className="error-text">{scan.error}</span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td align="right">
                    {scan.status === "RUNNING" && (
                      <button className="icon-action danger">
                        <CircleX size={18} />
                      </button>
                    )}

                    {scan.status === "FAILED" && (
                      <button className="retry">
                        <RotateCcw size={14} /> Retry
                      </button>
                    )}

                    {scan.status === "COMPLETED" && (
                      <button
                        className="view"
                        onClick={() => handleViewReport(scan.id)}
                      >
                        View Report
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINATION */}
          <footer className="pagination">
            <span>Showing 1–{scans.length} of {scans.length} scans</span>
            <div>
              <button><ChevronLeft size={18} /></button>
              <button><ChevronRight size={18} /></button>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}

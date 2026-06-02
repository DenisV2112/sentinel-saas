import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getScan } from "@/api/scans.api";
import { useTheme } from "@/utils/store/themeContext";
import Sidebar from "@/components/commons/Sidebar";
import { ArrowLeft, RefreshCw } from "lucide-react";

/* ─── Types ───────────────────────────────────────────── */

interface ScanDetail {
  id: string;
  status: string;
  scanType: string;
  projectName: string;
  projectId?: string;
  createdAt: string;
  completedAt?: string | null;
  findings?: {
    critical: number;
    high: number;
    medium: number;
  } | null;
}

/* ─── Component ────────────────────────────────────────── */

export default function ScanDetailPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { scanId } = useParams<{ scanId: string }>();

  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScanDetail = async () => {
    if (!scanId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getScan(scanId);
      const data = response.data;
      setScan({
        id: data.id ?? data.scanId,
        status: data.status ?? "UNKNOWN",
        scanType: data.scanType ?? data.type ?? "—",
        projectName: data.projectName ?? data.project ?? "—",
        projectId: data.projectId,
        createdAt: data.createdAt,
        completedAt: data.completedAt ?? null,
        findings: data.findings ?? null,
      });
    } catch (e: any) {
      setError(e.response?.data?.message || e.message || "Failed to load scan details");
      setScan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanDetail();
  }, [scanId]);

  /* ── loading ── */
  if (loading) {
    return (
      <div className="scans-layout">
        <Sidebar activeItem="scans" />
        <main className="scans-main" style={{ background: theme.colors.surface }}>
          <div style={{ padding: 40, textAlign: "center", color: theme.colors.text.secondary }}>
            Loading scan details...
          </div>
        </main>
      </div>
    );
  }

  /* ── error ── */
  if (error || !scan) {
    return (
      <div className="scans-layout">
        <Sidebar activeItem="scans" />
        <main className="scans-main" style={{ background: theme.colors.surface }}>
          <div
            style={{
              margin: "40px auto",
              maxWidth: 500,
              padding: 32,
              borderRadius: 16,
              background: theme.colors.background,
              border: `1px solid ${theme.colors.border}`,
              textAlign: "center",
            }}
          >
            <h2 style={{ color: theme.colors.danger, marginBottom: 12 }}>Error</h2>
            <p style={{ color: theme.colors.text.secondary, marginBottom: 20 }}>
              {error || "Scan not found"}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="primary-btn"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.onPrimary,
                }}
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} style={{ marginRight: 6 }} />
                Back
              </button>
              <button
                className="filter-btn"
                onClick={fetchScanDetail}
              >
                <RefreshCw size={16} style={{ marginRight: 6 }} />
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── empty findings ── */
  const hasFindings = scan.findings != null;

  /* ── success ── */
  return (
    <div className="scans-layout">
      <Sidebar activeItem="scans" />

      <main className="scans-main" style={{ background: theme.colors.surface }}>
        {/* HEADER */}
        <header
          className="scans-header"
          style={{
            background: theme.colors.background,
            borderColor: theme.colors.border,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="icon-btn"
              onClick={() => navigate(-1)}
              title="Back to scans"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 style={{ color: theme.colors.text.primary }}>
              Scan Details
            </h1>
          </div>
        </header>

        {/* Scan Info Card */}
        <div
          style={{
            margin: 20,
            padding: 24,
            borderRadius: 16,
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <span
              className={`tag tag-${scan.scanType.toLowerCase()}`}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {scan.scanType}
            </span>

            <span
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                background:
                  scan.status === "COMPLETED"
                    ? theme.colors.success || "#22c55e"
                    : scan.status === "FAILED"
                    ? theme.colors.danger || "#ef4444"
                    : theme.colors.warning || "#f59e0b",
                color: "#fff",
              }}
            >
              {scan.status}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <span style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Project</span>
              <p style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                {scan.projectName}
              </p>
            </div>
            <div>
              <span style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Created</span>
              <p style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                {scan.createdAt
                  ? new Date(scan.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
            <div>
              <span style={{ color: theme.colors.text.secondary, fontSize: 13 }}>Completed</span>
              <p style={{ color: theme.colors.text.primary, fontWeight: 600 }}>
                {scan.completedAt
                  ? new Date(scan.completedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Findings Section */}
        <div
          style={{
            margin: "0 20px 20px",
            padding: 24,
            borderRadius: 16,
            background: theme.colors.background,
            border: `1px solid ${theme.colors.border}`,
          }}
        >
          <h3 style={{ color: theme.colors.text.primary, marginBottom: 16 }}>
            Findings
          </h3>

          {!hasFindings && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: theme.colors.text.secondary,
              }}
            >
              <p style={{ fontSize: 16, marginBottom: 8 }}>
                No findings yet
              </p>
              <p style={{ fontSize: 13 }}>
                {scan.status === "RUNNING"
                  ? "The scan is still in progress. Check back once it completes."
                  : "No vulnerabilities were detected in this scan."}
              </p>
            </div>
          )}

          {hasFindings && scan.findings && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  textAlign: "center",
                  flex: 1,
                  minWidth: 120,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: "#991b1b",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  Critical
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>
                  {scan.findings.critical}
                </span>
              </div>

              <div
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  textAlign: "center",
                  flex: 1,
                  minWidth: 120,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: "#92400e",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  High
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#d97706" }}>
                  {scan.findings.high}
                </span>
              </div>

              <div
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  textAlign: "center",
                  flex: 1,
                  minWidth: 120,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: "#166534",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  Medium
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: "#16a34a" }}>
                  {scan.findings.medium}
                </span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

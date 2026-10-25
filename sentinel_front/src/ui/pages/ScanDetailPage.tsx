import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScan } from "@hooks/useScans";
import { useTheme } from "@/utils/store/themeContext";
import Sidebar from "@/components/commons/Sidebar";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { DetailSkeleton } from "@/components/commons/skeletons/DetailSkeleton";

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

  const { data, isLoading, error, refetch } = useScan(scanId ?? null);

  /* ── Transform API data to ScanDetail shape ── */
  const scan: ScanDetail | null = data
    ? {
        id: data.id ?? data.scanId,
        status: data.status ?? "UNKNOWN",
        scanType: data.scanType ?? data.type ?? "—",
        projectName: data.projectName ?? data.project ?? "—",
        projectId: data.projectId,
        createdAt: data.createdAt,
        completedAt: data.completedAt ?? null,
        findings: data.findings ?? null,
      }
    : null;

  /* ── loading ── */
  if (isLoading) {
    return (
      <div className="scans-layout">
        <Sidebar activeItem="scans" />
        <main className="scans-main" style={{ background: 'var(--color-surface)' }}>
          <div style={{ padding: 40 }}>
            <DetailSkeleton />
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
        <main className="scans-main" style={{ background: 'var(--color-surface)' }}>
          <div
            style={{
              margin: "40px auto",
              maxWidth: 500,
              padding: 32,
              borderRadius: 16,
              background: 'var(--color-background)',
              border: '1px solid var(--color-border)',
              textAlign: "center",
            }}
          >
            <h2 style={{ color: 'var(--color-danger)', marginBottom: 12 }}>Error</h2>
            <p style={{ marginBottom: 20 }} className="text-secondary">
              {error ? (error as Error).message : "Scan not found"}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="primary-btn"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                }}
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} style={{ marginRight: 6 }} />
                Back
              </button>
              <button
                className="filter-btn"
                onClick={() => refetch()}
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

      <main className="scans-main" style={{ background: 'var(--color-surface)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
        {/* HEADER */}
        <header
          className="scans-header"
          style={{
            background: 'var(--color-background)',
            borderColor: 'var(--color-border)',
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
            <h1 style={{ color: 'var(--color-text-primary)' }}>
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
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
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
                    ? 'var(--color-success)'
                    : scan.status === "FAILED"
                    ? 'var(--color-danger)'
                    : 'var(--color-warning)',
                color: "var(--color-on-primary)",
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
              <span style={{ fontSize: 13 }} className="text-secondary">Project</span>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {scan.projectName}
              </p>
            </div>
            <div>
              <span style={{ fontSize: 13 }} className="text-secondary">Created</span>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
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
              <span style={{ fontSize: 13 }} className="text-secondary">Completed</span>
              <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
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
            background: 'var(--color-background)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 16 }}>
            Findings
          </h3>

          {!hasFindings && (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
              }}
              className="text-secondary"
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
                  background: 'var(--color-bg-severity-critical)',
                  border: '1px solid var(--color-border-light)',
                  textAlign: "center",
                  flex: 1,
                  minWidth: 120,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                  className="text-danger"
                >
                  Critical
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-severity-critical)' }}>
                  {scan.findings.critical}
                </span>
              </div>

              <div
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: 'var(--color-bg-severity-high)',
                  border: '1px solid var(--color-border-light)',
                  textAlign: "center",
                  flex: 1,
                  minWidth: 120,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                  className="text-warning"
                >
                  High
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-severity-high)' }}>
                  {scan.findings.high}
                </span>
              </div>

              <div
                style={{
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: 'var(--color-bg-success)',
                  border: '1px solid var(--color-border-light)',
                  textAlign: "center",
                  flex: 1,
                  minWidth: 120,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                  className="text-success"
                >
                  Medium
                </span>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-success)' }}>
                  {scan.findings.medium}
                </span>
              </div>
            </div>
          )}
        </div>
        </motion.div>
      </main>
    </div>
  );
}

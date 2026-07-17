import { PlayCircle } from "lucide-react";
import { motion } from "framer-motion";
import { StateWrapper } from "@components/StateWrapper";
import type { ActiveScan } from "@hooks/useDashboard";
import { pulse } from "@/constants/animations";
import { cardStyle } from "./shared";

export interface ActiveScansListProps {
  scans: ActiveScan[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

const skeletonItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 0",
  borderBottom: "1px dashed var(--color-border)",
} as const;

function ScansListSkeleton() {
  return (
    <section className="card" style={cardStyle}>
      <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
        <PlayCircle size={18} />
        Active Scans
      </h3>
      <ul className="scans">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="skeleton-scan-item">
            <div style={skeletonItemStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: "70%",
                    height: 14,
                    borderRadius: 4,
                    background: "var(--color-surface-light)",
                  }}
                />
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: 48,
                    height: 16,
                    borderRadius: 4,
                    background: "var(--color-surface-light)",
                  }}
                  transition={{ ...pulse.transition, delay: 0.15 }}
                />
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: "50%",
                    height: 10,
                    borderRadius: 4,
                    background: "var(--color-surface-light)",
                  }}
                  transition={{ ...pulse.transition, delay: 0.3 }}
                />
              </div>
              <motion.div
                className="skeleton-shape"
                animate={pulse}
                style={{
                  width: 40,
                  height: 12,
                  borderRadius: 4,
                  background: "var(--color-surface-light)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ActiveScansList({
  scans,
  isLoading,
  isError,
  onRetry,
}: ActiveScansListProps) {
  return (
    <StateWrapper
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && scans.length === 0}
      skeleton={<ScansListSkeleton />}
      errorMessage="Failed to load active scans"
      onRetry={onRetry}
      emptyMessage="No active scans"
    >
      <section className="card" style={cardStyle}>
        <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
          <PlayCircle size={18} />
          Active Scans
        </h3>

        <ul className="scans">
          {scans.map((scan) => (
            <li key={scan.scanId}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {scan.projectName}
                </strong>
                <span className="tag" style={{ alignSelf: "flex-start" }}>
                  {scan.scanType}
                </span>
                <p style={{ color: "var(--color-text-secondary)" }}>
                  {scan.statusMessage ?? "Scanning..."}
                </p>
              </div>
              <span style={{ color: "var(--color-text-tertiary)" }}>
                {scan.elapsedTime ?? "--:--"}
              </span>
            </li>
          ))}
        </ul>

        <button
          className="btn-outline"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
          }}
        >
          + Start New Scan
        </button>
      </section>
    </StateWrapper>
  );
}

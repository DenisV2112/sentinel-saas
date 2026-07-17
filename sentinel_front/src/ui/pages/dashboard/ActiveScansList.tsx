import { PlayCircle } from "lucide-react";
import { StateWrapper } from "@components/StateWrapper";
import type { ActiveScan } from "@hooks/useDashboard";
import { cardStyle } from "./shared";

export interface ActiveScansListProps {
  scans: ActiveScan[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
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
      skeleton={
        <section className="card" style={cardStyle}>
          <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
            <PlayCircle size={18} />
            Active Scans
          </h3>
          <div style={{ padding: "20px 0" }}>
            <p style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>
          </div>
        </section>
      }
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

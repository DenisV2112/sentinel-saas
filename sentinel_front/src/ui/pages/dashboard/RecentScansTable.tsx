import { Clock } from "lucide-react";
import { StateWrapper } from "@components/StateWrapper";
import { TableSkeleton } from "@/components/commons/skeletons/TableSkeleton";
import type { RecentScan } from "@hooks/useDashboard";
import { cardStyle } from "./shared";

export interface RecentScansTableProps {
  scans: RecentScan[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function RecentScansTable({
  scans,
  isLoading,
  isError,
  onRetry,
}: RecentScansTableProps) {
  return (
    <StateWrapper
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && scans.length === 0}
      skeleton={
        <section className="card" style={cardStyle}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
              <Clock size={18} />
              Recent Scans
            </h3>
          </div>
          <TableSkeleton columns={5} rows={4} />
        </section>
      }
      errorMessage="Failed to load recent scans"
      onRetry={onRetry}
      emptyMessage="No scans yet"
    >
      <section className="card" style={cardStyle}>
        <div className="card-header">
          <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
            <Clock size={18} />
            Recent Scans
          </h3>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                {["Project", "Type", "Status", "Quality Gate", ""].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      color: "var(--color-text-secondary)",
                      ...(i === 0
                        ? {
                            position: "sticky" as const,
                            left: 0,
                            zIndex: 1,
                            background: "var(--color-surface)",
                          }
                        : {}),
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.scanId}>
                  <td
                    style={{
                      color: "var(--color-text-primary)",
                      position: "sticky",
                      left: 0,
                      zIndex: 0,
                      background: "var(--color-surface)",
                    }}
                  >
                    {scan.projectName}
                  </td>
                  <td>
                    <span className="tag">{scan.scanType}</span>
                  </td>
                  <td style={{ color: "var(--color-text-secondary)" }}>{scan.status}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: scan.qualityGatePassed
                          ? "var(--color-success)"
                          : "var(--color-danger)",
                        color: "var(--color-on-primary)",
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
        </div>
      </section>
    </StateWrapper>
  );
}

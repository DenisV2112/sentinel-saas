import { Flame, ShieldCheck, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { StateWrapper } from "@components/StateWrapper";
import type { TopRiskProject } from "@hooks/useDashboard";
import { pulse } from "@/constants/animations";
import { cardStyle } from "./shared";

export interface TopRiskProjectsProps {
  projects: TopRiskProject[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

const skeletonItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  borderBottom: "1px dashed var(--color-border)",
} as const;

function RiskListSkeleton() {
  return (
    <section className="card" style={cardStyle}>
      <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
        <Flame size={18} />
        Top Risk Projects
      </h3>
      <ul className="risk">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="skeleton-risk-item">
            <div style={skeletonItemStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "var(--color-surface-light)",
                    flexShrink: 0,
                  }}
                />
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: "60%",
                    height: 14,
                    borderRadius: 4,
                    background: "var(--color-surface-light)",
                  }}
                  transition={{ ...pulse.transition, delay: 0.1 }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: 60,
                    height: 12,
                    borderRadius: 4,
                    background: "var(--color-surface-light)",
                  }}
                  transition={{ ...pulse.transition, delay: 0.2 }}
                />
                <motion.div
                  className="skeleton-shape"
                  animate={pulse}
                  style={{
                    width: 40,
                    height: 12,
                    borderRadius: 4,
                    background: "var(--color-surface-light)",
                  }}
                  transition={{ ...pulse.transition, delay: 0.3 }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TopRiskProjects({
  projects,
  isLoading,
  isError,
  onRetry,
}: TopRiskProjectsProps) {
  return (
    <StateWrapper
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && !isError && projects.length === 0}
      skeleton={<RiskListSkeleton />}
      errorMessage="Failed to load risk projects"
      onRetry={onRetry}
      emptyMessage="All clear — no risk projects found"
    >
      <section className="card" style={cardStyle}>
        <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
          <Flame size={18} />
          Top Risk Projects
        </h3>

        <ul className="risk">
          {projects.map((project) => {
            const isSafe = project.critical === 0 && project.high === 0;
            return (
              <li key={project.project}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isSafe ? (
                    <ShieldCheck size={16} color={"var(--color-success)"} />
                  ) : project.critical > 0 ? (
                    <Flame size={16} color={"var(--color-danger)"} />
                  ) : (
                    <AlertTriangle size={16} color={"var(--color-warning)"} />
                  )}
                  <strong style={{ color: "var(--color-text-primary)" }}>
                    {project.project}
                  </strong>
                </div>

                <div style={{ marginTop: 6 }}>
                  {isSafe ? (
                    <div style={{ color: "var(--color-success)" }}>Safe</div>
                  ) : (
                    <>
                      <div style={{ color: "var(--color-danger)" }}>
                        {project.critical} Critical
                      </div>
                      <div style={{ color: "var(--color-warning)" }}>
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
    </StateWrapper>
  );
}

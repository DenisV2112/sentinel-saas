import { Flame, ShieldCheck, AlertTriangle } from "lucide-react";
import { StateWrapper } from "@components/StateWrapper";
import type { TopRiskProject } from "@hooks/useDashboard";
import { cardStyle } from "./shared";

export interface TopRiskProjectsProps {
  projects: TopRiskProject[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
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
      skeleton={
        <section className="card" style={cardStyle}>
          <h3 style={{ display: "flex", gap: 8, color: "var(--color-text-primary)" }}>
            <Flame size={18} />
            Top Risk Projects
          </h3>
          <div style={{ padding: "20px 0" }}>
            <p style={{ color: "var(--color-text-tertiary)" }}>Loading...</p>
          </div>
        </section>
      }
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

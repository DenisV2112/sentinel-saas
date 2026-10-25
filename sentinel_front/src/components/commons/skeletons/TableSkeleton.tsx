import { motion } from "framer-motion";
import { pulse } from "@/constants/animations";

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export const TableSkeleton = ({ columns = 6, rows = 4 }: TableSkeletonProps) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading"
    style={{
      borderRadius: "12px",
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      overflow: "hidden",
    }}
  >
    {/* Header row */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-surface-light)",
        gap: "8px",
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <motion.div
          key={`header-${i}`}
          style={{
            height: "14px",
            borderRadius: "4px",
            background: "var(--color-border)",
          }}
          animate={pulse}
        />
      ))}
    </div>

    {/* Data rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={`row-${rowIdx}`}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          padding: "12px 16px",
          borderBottom: rowIdx < rows - 1 ? "1px solid var(--color-border)" : "none",
          gap: "8px",
        }}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <motion.div
            key={`cell-${rowIdx}-${colIdx}`}
            style={{
              height: "12px",
              borderRadius: "4px",
              background: "var(--color-surface-light)",
              width: colIdx === 1 ? "90%" : colIdx === 2 ? "70%" : "100%",
            }}
            animate={pulse}
            transition={{ ...pulse.transition, delay: rowIdx * 0.08 + colIdx * 0.02 }}
          />
        ))}
      </div>
    ))}
  </div>
);

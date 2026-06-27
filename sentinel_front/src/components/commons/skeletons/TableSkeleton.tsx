import { motion, type TargetAndTransition } from "framer-motion";

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

const pulse: TargetAndTransition = {
  opacity: [0.4, 0.8, 0.4],
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
};

export const TableSkeleton = ({ columns = 6, rows = 4 }: TableSkeletonProps) => (
  <div
    style={{
      borderRadius: "12px",
      background: "#1a1a1a",
      border: "1px solid #2a2a2a",
      overflow: "hidden",
    }}
  >
    {/* Header row */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        padding: "12px 16px",
        borderBottom: "1px solid #2a2a2a",
        background: "#222",
        gap: "8px",
      }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <motion.div
          key={`header-${i}`}
          style={{
            height: "14px",
            borderRadius: "4px",
            background: "#333",
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
          borderBottom: rowIdx < rows - 1 ? "1px solid #2a2a2a" : "none",
          gap: "8px",
        }}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <motion.div
            key={`cell-${rowIdx}-${colIdx}`}
            style={{
              height: "12px",
              borderRadius: "4px",
              background: "#2a2a2a",
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

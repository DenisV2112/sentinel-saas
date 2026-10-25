import { motion } from "framer-motion";
import { pulse } from "@/constants/animations";

export interface DetailSkeletonProps {
  rows?: number;
}

export const DetailSkeleton = ({ rows = 6 }: DetailSkeletonProps) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading"
    style={{
      borderRadius: "12px",
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    }}
  >
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {/* Label placeholder */}
        <motion.div
          style={{
            height: "12px",
            width: "30%",
            borderRadius: "4px",
            background: "var(--color-surface-light)",
          }}
          animate={pulse}
        />
        {/* Value placeholder */}
        <motion.div
          style={{
            height: "16px",
            width: `${60 + (i % 3) * 15}%`,
            borderRadius: "4px",
            background: "var(--color-border)",
          }}
          animate={pulse}
          transition={{ ...pulse.transition, delay: i * 0.1 }}
        />
      </div>
    ))}
  </div>
);

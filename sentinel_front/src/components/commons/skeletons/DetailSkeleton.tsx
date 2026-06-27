import { motion, type TargetAndTransition } from "framer-motion";

export interface DetailSkeletonProps {
  rows?: number;
}

const pulse: TargetAndTransition = {
  opacity: [0.4, 0.8, 0.4],
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
};

export const DetailSkeleton = ({ rows = 6 }: DetailSkeletonProps) => (
  <div
    style={{
      borderRadius: "12px",
      background: "#1a1a1a",
      border: "1px solid #2a2a2a",
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
            background: "#333",
          }}
          animate={pulse}
        />
        {/* Value placeholder */}
        <motion.div
          style={{
            height: "16px",
            width: `${60 + (i % 3) * 15}%`,
            borderRadius: "4px",
            background: "#2a2a2a",
          }}
          animate={pulse}
          transition={{ ...pulse.transition, delay: i * 0.1 }}
        />
      </div>
    ))}
  </div>
);

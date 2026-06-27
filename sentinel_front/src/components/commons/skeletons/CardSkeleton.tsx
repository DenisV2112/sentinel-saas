import { motion, type TargetAndTransition } from "framer-motion";

export interface CardSkeletonProps {
  count?: number;
}

const pulse: TargetAndTransition = {
  opacity: [0.4, 0.8, 0.4],
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
};

export const CardSkeleton = ({ count = 1 }: CardSkeletonProps) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          borderRadius: "12px",
          background: "#1a1a1a",
          border: "1px solid #2a2a2a",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Title placeholder */}
        <motion.div
          style={{
            height: "18px",
            width: "60%",
            borderRadius: "4px",
            background: "#2a2a2a",
          }}
          animate={pulse}
        />
        {/* Content line 1 */}
        <motion.div
          style={{
            height: "14px",
            width: "100%",
            borderRadius: "4px",
            background: "#2a2a2a",
          }}
          animate={pulse}
          transition={{ ...pulse.transition, delay: i * 0.1 }}
        />
        {/* Content line 2 */}
        <motion.div
          style={{
            height: "14px",
            width: "80%",
            borderRadius: "4px",
            background: "#2a2a2a",
          }}
          animate={pulse}
          transition={{ ...pulse.transition, delay: i * 0.1 + 0.05 }}
        />
      </div>
    ))}
  </>
);

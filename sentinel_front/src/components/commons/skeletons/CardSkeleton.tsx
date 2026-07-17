import { motion } from "framer-motion";
import { pulse } from "@/constants/animations";

export interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton = ({ count = 1 }: CardSkeletonProps) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          borderRadius: "12px",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
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
              background: "var(--color-surface-light)",
            }}
            animate={pulse}
          />
          {/* Content line 1 */}
          <motion.div
            style={{
              height: "14px",
              width: "100%",
              borderRadius: "4px",
              background: "var(--color-surface-light)",
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
              background: "var(--color-surface-light)",
            }}
          animate={pulse}
          transition={{ ...pulse.transition, delay: i * 0.1 + 0.05 }}
        />
      </div>
    ))}
  </>
);

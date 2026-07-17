import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { pulse } from "@/constants/animations";

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  danger?: boolean;
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  danger = false,
  isLoading = false,
}: KpiCardProps) {
  if (isLoading) {
    return (
      <div
        className="kpi"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <motion.div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--color-surface-light)",
          }}
          animate={pulse}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <motion.div
            style={{
              height: 12,
              width: "60%",
              borderRadius: 4,
              background: "var(--color-surface-light)",
            }}
            animate={pulse}
          />
          <motion.div
            style={{
              height: 24,
              width: "40%",
              borderRadius: 4,
              background: "var(--color-surface-light)",
            }}
            animate={pulse}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="kpi"
      style={{
        background: "var(--color-surface)",
        borderColor: danger ? "var(--color-danger)" : "var(--color-border)",
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      <Icon
        size={28}
        color={danger ? "var(--color-danger)" : "var(--color-primary)"}
      />
      <div>
        <p style={{ color: "var(--color-text-secondary)" }}>{title}</p>
        <h3
          style={{
            color: danger ? "var(--color-danger)" : "var(--color-text-primary)",
          }}
        >
          {value}
        </h3>
      </div>
    </div>
  );
}

import type { TargetAndTransition } from "framer-motion";

export const pulse: TargetAndTransition = {
  opacity: [0.4, 0.8, 0.4],
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
};

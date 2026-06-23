interface CardSkeletonProps {
  height?: number;
  count?: number;
}

/** Skeleton for stat cards and info cards */
export default function CardSkeleton({ height = 120, count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-card"
          style={{
            height: `${height}px`,
            borderRadius: "12px",
            background: "linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
            marginBottom: "1rem",
          }}
        />
      ))}
    </>
  );
}

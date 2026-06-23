/** Full-page skeleton shown during lazy route loading */
export default function PageSkeleton() {
  return (
    <div className="app" style={{ minHeight: "100vh", padding: "2rem" }}>
      {/* Header skeleton */}
      <div
        className="skeleton-block"
        style={{
          height: "2.5rem",
          width: "40%",
          marginBottom: "2rem",
          borderRadius: "8px",
          background: "linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />

      {/* Stats row */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton-block"
            style={{
              flex: 1,
              height: "120px",
              borderRadius: "12px",
              background: "linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Content skeleton */}
      <div
        className="skeleton-block"
        style={{
          height: "300px",
          borderRadius: "12px",
          background: "linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />

      {/* Inject shimmer keyframes once */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

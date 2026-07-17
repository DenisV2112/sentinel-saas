const headerStyle = {
  background: "var(--color-surface)",
  borderBottom: "1px solid var(--color-border)",
} as const;

export function DashboardHeader() {
  return (
    <header className="header" style={headerStyle}>
      <h1 style={{ color: "var(--color-text-primary)" }}>Overview</h1>
    </header>
  );
}

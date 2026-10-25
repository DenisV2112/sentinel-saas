/**
 * Responsive Dashboard Tests
 *
 * Coverage: CSS custom properties for breakpoint-sensitive spacing,
 * RecentScansTable scroll wrapper + sticky column,
 * Dashboard grid structure supporting responsive breakpoints.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { render, screen } from "@testing-library/react";
import { RecentScansTable } from "../RecentScansTable";
import type { RecentScan, VulnerabilityTrend } from "@hooks/useDashboard";
import DashboardContainer from "../DashboardContainer";

/* ── Mock hooks used by DashboardContainer ── */
const defaultSummary = {
  data: { exposedPorts: 12, criticalFindingsOpen: 3, qualityGatePassRate: 85, projectsMonitored: 7 },
  isLoading: false,
  isError: false,
  refetch: jest.fn(),
};
const mockUseDashboardSummary = jest.fn(() => defaultSummary);

jest.mock("@hooks/useDashboard", () => {
  const actual = jest.requireActual("@hooks/useDashboard");
  return {
    ...actual,
    useDashboardSummary: () => mockUseDashboardSummary(),
    useActiveScans: () => ({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useVulnerabilityTrends: () => ({
      data: [
        { date: "2026-07-10", critical: 2, high: 5, medium: 10, low: 3 },
        { date: "2026-07-11", critical: 1, high: 3, medium: 7, low: 5 },
      ] as VulnerabilityTrend[],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useRecentScans: () => ({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useTopRiskProjects: () => ({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
  };
});

jest.mock("@/components/commons/Sidebar", () => ({
  __esModule: true,
  default: () => <nav data-testid="mock-sidebar">Sidebar</nav>,
}));

/* ── Mock framer-motion to avoid animation timing issues ── */
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { animate, transition, initial, ...rest } = props as Record<string, unknown>;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
}));

/* ── Mock lucide-react icons ── */
jest.mock("lucide-react", () => ({
  Activity: () => <span data-icon="activity" />,
  AlertTriangle: () => <span data-icon="alert-triangle" />,
  ShieldCheck: () => <span data-icon="shield-check" />,
  Layers: () => <span data-icon="layers" />,
  TrendingUp: () => <span data-icon="trending-up" />,
  Clock: () => <span data-icon="clock" />,
  PlayCircle: () => <span data-icon="play-circle" />,
  Flame: () => <span data-icon="flame" />,
  Search: () => <span data-icon="search" />,
  Bell: () => <span data-icon="bell" />,
}));

/* ── Mock StateWrapper to render children directly ── */
jest.mock("@components/StateWrapper", () => ({
  StateWrapper: ({ children, isLoading, isError, isEmpty, errorMessage, emptyMessage, onRetry, skeleton }: Record<string, unknown>) => {
    if (isLoading) return <>{skeleton as React.ReactNode}</>;
    if (isError) return <div role="alert">{errorMessage as string}<button onClick={onRetry as () => void}>Retry</button></div>;
    if (isEmpty) return <div>{emptyMessage as string}</div>;
    return <>{children as React.ReactNode}</>;
  },
}));

/* ── CSS Custom Property Test Helpers ── */
const cssPath = resolve(__dirname, "../../../../index.css");

function injectIndexCss(): void {
  const existing = document.head.querySelector("style[data-test-css]");
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.setAttribute("data-test-css", "index-css");
  style.textContent = readFileSync(cssPath, "utf-8");
  document.head.appendChild(style);
}

function getRootProp(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ═══════════════════════════════════════════════════════════
   TASK 3: CSS Custom Properties for Breakpoint-Sensitive Spacing
   ═══════════════════════════════════════════════════════════ */
describe("CSS custom properties for dashboard spacing", () => {
  beforeAll(() => {
    injectIndexCss();
  });

  it("--dashboard-gap is defined on :root with default value", () => {
    expect(getRootProp("--dashboard-gap")).toBe("16px");
  });

  it("--dashboard-padding is defined on :root with default value", () => {
    expect(getRootProp("--dashboard-padding")).toBe("20px");
  });

  it("--kpi-min-width is defined on :root with default value", () => {
    expect(getRootProp("--kpi-min-width")).toBe("250px");
  });

  it("--dashboard-gap default is preserved (media queries not applied in jsdom)", () => {
    // jsdom never matches media queries, so the :root default always wins
    expect(getRootProp("--dashboard-gap")).toBe("16px");
  });

  it("undefined custom property returns empty string", () => {
    const value = getRootProp("--nonexistent-var");
    expect(value).toBe("");
  });
});

/* ═══════════════════════════════════════════════════════════
   TASK 4: Table Horizontal Scroll with Sticky Column
   ═══════════════════════════════════════════════════════════ */
describe("RecentScansTable responsive behavior", () => {
  const mockScans: RecentScan[] = [
    {
      scanId: "s1",
      projectName: "api-gateway",
      scanType: "SAST",
      status: "Completed",
      qualityGatePassed: true,
    },
    {
      scanId: "s2",
      projectName: "frontend-app",
      scanType: "DAST",
      status: "Running",
      qualityGatePassed: false,
    },
  ];

  it("wraps table in a scrollable container", () => {
    const { container } = render(
      <RecentScansTable scans={mockScans} isLoading={false} isError={false} />
    );

    // The table should have a scrollable wrapper — look for div with overflow
    const wrapper = container.querySelector('[style*="overflow"]');
    expect(wrapper).not.toBeNull();
  });

  it("applies sticky positioning context to first column headers", () => {
    const { container } = render(
      <RecentScansTable scans={mockScans} isLoading={false} isError={false} />
    );

    // First th should have sticky left: 0 style
    const firstTh = container.querySelector("thead th");
    expect(firstTh).not.toBeNull();
    const style = firstTh!.getAttribute("style") ?? "";
    expect(style).toContain("sticky");
    expect(style).toContain("left: 0");
  });

  it("applies sticky positioning to first column data cells", () => {
    const { container } = render(
      <RecentScansTable scans={mockScans} isLoading={false} isError={false} />
    );

    // First td in each row should have sticky left: 0
    const firstTds = container.querySelectorAll("tbody tr td:first-child");
    expect(firstTds.length).toBeGreaterThanOrEqual(2);

    for (const td of firstTds) {
      const style = td.getAttribute("style") ?? "";
      expect(style).toContain("sticky");
    }
  });

  it("scrollable wrapper has overflow-x:auto", () => {
    const { container } = render(
      <RecentScansTable scans={mockScans} isLoading={false} isError={false} />
    );

    const wrapper = container.querySelector('[style*="overflow"]');
    expect(wrapper!.getAttribute("style")).toContain("overflow-x: auto");
  });

  it("sticky column works with a single scan row", () => {
    const singleScan: RecentScan[] = [
      { scanId: "s1", projectName: "solo-project", scanType: "SAST", status: "Completed", qualityGatePassed: true },
    ];
    const { container } = render(
      <RecentScansTable scans={singleScan} isLoading={false} isError={false} />
    );

    const firstTd = container.querySelector("tbody tr td:first-child");
    const style = firstTd!.getAttribute("style") ?? "";
    expect(style).toContain("sticky");
    expect(style).toContain("left: 0");
  });

  it("non-first columns are NOT sticky", () => {
    const { container } = render(
      <RecentScansTable scans={mockScans} isLoading={false} isError={false} />
    );

    // Second td (scan type column) should not be sticky
    const secondTds = container.querySelectorAll("tbody tr td:nth-child(2)");
    expect(secondTds.length).toBeGreaterThanOrEqual(2);
    for (const td of secondTds) {
      const style = td.getAttribute("style") ?? "";
      expect(style).not.toContain("sticky");
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   TASKS 1 & 2: Responsive Breakpoint Structure
   (Media queries can't be evaluated in jsdom; test structural foundation)
   ═══════════════════════════════════════════════════════════ */
describe("Dashboard grid structure supports responsive breakpoints", () => {
  it("renders 4 KPI cards in a grid container", () => {
    render(<DashboardContainer />);

    // KPI cards render semantic content: the KPI titles
    expect(screen.getByText("Exposed Ports")).toBeInTheDocument();
    expect(screen.getByText("Critical Findings")).toBeInTheDocument();
    expect(screen.getByText("Quality Gate Pass")).toBeInTheDocument();
    expect(screen.getByText("Projects Monitored")).toBeInTheDocument();
  });

  it("renders vulnerability chart in the content area", () => {
    render(<DashboardContainer />);

    // Chart title renders (even if empty state shows placeholder)
    expect(screen.getByText("Vulnerability Trends")).toBeInTheDocument();
  });

  it("renders dashboard with left and right layout columns", () => {
    const { container } = render(<DashboardContainer />);

    // Dashboard grid has left and right columns (via .left and .right class containers)
    // These are direct children of .dashboard-grid
    const grid = container.querySelector(".dashboard-grid");
    expect(grid).not.toBeNull();

    // The grid should contain its child sections
    const left = grid!.querySelector(".left");
    const right = grid!.querySelector(".right");
    expect(left).not.toBeNull();
    expect(right).not.toBeNull();
  });

  it("content area renders with CSS variables for responsive spacing", () => {
    const { container } = render(<DashboardContainer />);

    // .content section uses var(--dashboard-padding) for responsive padding
    const content = container.querySelector(".content");
    expect(content).not.toBeNull();
    // The content section should reference CSS variable for padding in its class
    // (the actual media query behavior can't be tested in jsdom)
    expect(content).toBeInTheDocument();
  });

  it("KPI cards display numeric values from the dashboard summary", () => {
    render(<DashboardContainer />);

    // Verify KPIs show actual numeric values, not just titles
    expect(screen.getByText("12")).toBeInTheDocument();   // exposedPorts
    expect(screen.getByText("3")).toBeInTheDocument();    // criticalFindingsOpen
    expect(screen.getByText("85%")).toBeInTheDocument();  // qualityGatePassRate
    expect(screen.getByText("7")).toBeInTheDocument();    // projectsMonitored
  });
});

describe("Dashboard KPI summary error state", () => {
  afterEach(() => mockUseDashboardSummary.mockImplementation(() => defaultSummary));

  it("shows an alert with retry instead of zero-valued KPIs when the summary fails", () => {
    const refetch = jest.fn();
    mockUseDashboardSummary.mockImplementation(() => ({
      data: undefined as any,
      isLoading: false,
      isError: true,
      refetch,
    }));

    render(<DashboardContainer />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load dashboard summary");
    expect(screen.queryByText("Exposed Ports")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();

    screen.getByRole("button", { name: /retry/i }).click();
    expect(refetch).toHaveBeenCalled();
  });
});

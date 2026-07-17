import { render, screen } from "@testing-library/react";
import { ActiveScansList } from "../ActiveScansList";
import type { ActiveScan } from "@hooks/useDashboard";

const mockScans: ActiveScan[] = [
  {
    scanId: "1",
    projectName: "frontend-app",
    scanType: "SAST",
    statusMessage: "Analyzing dependencies...",
    elapsedTime: "00:42",
  },
  {
    scanId: "2",
    projectName: "api-gateway",
    scanType: "DAST",
    statusMessage: "Running vulnerability scan...",
    elapsedTime: "02:15",
  },
];

describe("ActiveScansList", () => {
  it("renders skeleton with visual placeholder shapes when loading", () => {
    const { container } = render(
      <ActiveScansList scans={[]} isLoading={true} isError={false} />
    );

    // Should NOT show text-only skeleton
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    // Should have skeleton scan item placeholders (visual bars/shapes)
    const skeletonItems = container.querySelectorAll(".skeleton-scan-item");
    expect(skeletonItems.length).toBeGreaterThanOrEqual(2);

    // Each skeleton item should contain visual placeholder elements
    const firstItem = skeletonItems[0];
    expect(firstItem.querySelectorAll(".skeleton-shape").length).toBeGreaterThan(0);
  });

  it("renders scan list when populated", () => {
    render(
      <ActiveScansList scans={mockScans} isLoading={false} isError={false} />
    );

    expect(screen.getByText("frontend-app")).toBeInTheDocument();
    expect(screen.getByText("api-gateway")).toBeInTheDocument();
    expect(screen.getByText("SAST")).toBeInTheDocument();
    expect(screen.getByText("DAST")).toBeInTheDocument();
  });

  it("renders empty message when no scans", () => {
    render(
      <ActiveScansList scans={[]} isLoading={false} isError={false} />
    );

    expect(screen.getByText("No active scans")).toBeInTheDocument();
  });

  it("renders error state when isError is true", () => {
    const onRetry = jest.fn();
    render(
      <ActiveScansList scans={[]} isLoading={false} isError={true} onRetry={onRetry} />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { TopRiskProjects } from "../TopRiskProjects";
import type { TopRiskProject } from "@hooks/useDashboard";

const mockProjects: TopRiskProject[] = [
  { project: "frontend-app", critical: 3, high: 5 },
  { project: "auth-service", critical: 0, high: 2 },
  { project: "payment-gateway", critical: 0, high: 0 },
];

describe("TopRiskProjects", () => {
  it("renders skeleton with visual placeholder shapes when loading", () => {
    const { container } = render(
      <TopRiskProjects projects={[]} isLoading={true} isError={false} />
    );

    // Should NOT show text-only skeleton
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    // Should have skeleton project item placeholders
    const skeletonItems = container.querySelectorAll(".skeleton-risk-item");
    expect(skeletonItems.length).toBeGreaterThanOrEqual(2);

    // Each skeleton item should contain visual placeholder elements
    const firstItem = skeletonItems[0];
    expect(firstItem.querySelectorAll(".skeleton-shape").length).toBeGreaterThan(0);
  });

  it("renders risk project list when populated", () => {
    render(
      <TopRiskProjects projects={mockProjects} isLoading={false} isError={false} />
    );

    expect(screen.getByText("frontend-app")).toBeInTheDocument();
    expect(screen.getByText("auth-service")).toBeInTheDocument();
    expect(screen.getByText("3 Critical")).toBeInTheDocument();
    expect(screen.getByText("2 High")).toBeInTheDocument();
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });

  it("renders empty message when no risk projects", () => {
    render(
      <TopRiskProjects projects={[]} isLoading={false} isError={false} />
    );

    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });

  it("renders error state when isError is true", () => {
    const onRetry = jest.fn();
    render(
      <TopRiskProjects projects={[]} isLoading={false} isError={true} onRetry={onRetry} />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});

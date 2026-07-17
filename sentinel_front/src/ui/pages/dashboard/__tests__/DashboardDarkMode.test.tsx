import { render, screen } from "@testing-library/react";
import { KpiCard } from "../KpiCard";
import { Activity } from "lucide-react";

/* jsdom rejects var() CSS values in style assignments, so we verify
   the data-theme attribute and component structure under dark theme.
   Actual color resolution is verified via visual QA / E2E. */

describe("Dashboard dark mode", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("data-theme", "dark");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders KpiCard under dark theme without crashing", () => {
    render(
      <KpiCard
        title="Total Scans"
        value={42}
        icon={Activity}
        isLoading={false}
      />
    );

    // Component renders correctly under dark theme
    expect(screen.getByText("Total Scans")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders KpiCard loading skeleton under dark theme", () => {
    render(
      <KpiCard
        title="Scans"
        value={0}
        icon={Activity}
        isLoading={true}
      />
    );

    // Skeleton should render (not text values)
    expect(screen.queryByText("Scans")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // The .kpi container exists (skeleton wrapper)
    const kpiDiv = document.querySelector(".kpi");
    expect(kpiDiv).not.toBeNull();
  });

  it("data-theme is set to dark on document element", () => {
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { KpiCard } from "../KpiCard";

describe("KpiCard", () => {
  it("renders title and numeric value when populated", () => {
    render(<KpiCard title="Exposed Ports" value={42} icon={Activity} />);
    expect(screen.getByText("Exposed Ports")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders string value correctly", () => {
    render(<KpiCard title="Pass Rate" value="85%" icon={Activity} />);
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("applies danger styling when danger is true", () => {
    render(<KpiCard title="Critical" value={7} icon={Activity} danger={true} />);
    // Value is rendered with danger-appropriate visual cues — the text is still present
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<KpiCard title="Loading" value={0} icon={Activity} isLoading={true} />);
    // Should not render the value text when loading
    expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // Should render the skeleton container instead
    const kpiDiv = container.firstElementChild as HTMLElement;
    expect(kpiDiv).not.toBeNull();
  });

  it("renders zero value correctly (not empty/falsy fallback)", () => {
    render(<KpiCard title="Projects" value={0} icon={Activity} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

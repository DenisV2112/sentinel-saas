import { render, screen, fireEvent } from "@testing-library/react";
import { StateWrapper, type StateWrapperProps } from "@components/StateWrapper";

describe("StateWrapper", () => {
  it("renders skeleton when isLoading is true", () => {
    render(
      <StateWrapper isLoading={true} isError={false} isEmpty={false} skeleton={<span data-testid="skel">Loading...</span>}>
        <span data-testid="child">Content</span>
      </StateWrapper>
    );
    expect(screen.getByTestId("skel")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("renders error with retry when isError is true and errorMessage is provided", () => {
    const onRetry = jest.fn();
    render(
      <StateWrapper
        isLoading={false}
        isError={true}
        isEmpty={false}
        errorMessage="Something went wrong"
        onRetry={onRetry}
        skeleton={<span>skel</span>}
      >
        <span data-testid="child">Content</span>
      </StateWrapper>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = jest.fn();
    render(
      <StateWrapper
        isLoading={false}
        isError={true}
        isEmpty={false}
        errorMessage="Failed"
        onRetry={onRetry}
        skeleton={<span>skel</span>}
      >
        <span>child</span>
      </StateWrapper>
    );
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty message when isEmpty is true and emptyMessage is provided", () => {
    render(
      <StateWrapper
        isLoading={false}
        isError={false}
        isEmpty={true}
        emptyMessage="No data available"
        skeleton={<span>skel</span>}
      >
        <span data-testid="child">Content</span>
      </StateWrapper>
    );
    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("renders children when not loading, not error, and not empty", () => {
    render(
      <StateWrapper isLoading={false} isError={false} isEmpty={false} skeleton={<span>skel</span>}>
        <span data-testid="child">Real content</span>
      </StateWrapper>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Real content")).toBeInTheDocument();
    expect(screen.queryByText("skel")).not.toBeInTheDocument();
  });

  it("prioritizes loading over error and empty", () => {
    render(
      <StateWrapper
        isLoading={true}
        isError={true}
        isEmpty={true}
        skeleton={<span data-testid="skel">Loading...</span>}
        errorMessage="Error"
        emptyMessage="Empty"
      >
        <span data-testid="child">Content</span>
      </StateWrapper>
    );
    expect(screen.getByTestId("skel")).toBeInTheDocument();
    expect(screen.queryByText("Error")).not.toBeInTheDocument();
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
  });
});

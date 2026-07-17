import type { ReactNode } from "react";

export interface StateWrapperProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  skeleton: ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  children: ReactNode;
}

export function StateWrapper({
  isLoading,
  isError,
  isEmpty,
  skeleton,
  errorMessage = "An error occurred",
  onRetry,
  emptyMessage = "No data available",
  children,
}: StateWrapperProps) {
  if (isLoading) {
    return <>{skeleton}</>;
  }

  if (isError) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-3)",
          padding: "var(--space-5)",
          color: "var(--color-danger)",
        }}
        role="alert"
      >
        <p>{errorMessage}</p>
        {onRetry ? (
          <button onClick={onRetry} className="btn-sm" aria-label="Retry">
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "var(--space-5)",
          color: "var(--color-text-tertiary)",
        }}
      >
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export default function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    margin: '40px auto',
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    color: 'var(--color-danger)',
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '12px',
  };

  const messageStyle: React.CSSProperties = {
    color: 'var(--color-text-secondary)',
    fontSize: '14px',
    marginBottom: '16px',
  };

  const stackStyle: React.CSSProperties = {
    background: 'var(--color-secondary-dark)',
    border: '1px solid var(--color-border-dark)',
    borderRadius: '8px',
    padding: '12px',
    color: 'var(--color-text-tertiary)',
    fontSize: '12px',
    fontFamily: 'monospace',
    textAlign: 'left',
    overflow: 'auto',
    maxHeight: '200px',
    marginBottom: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    background: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  };

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>Something went wrong</div>
      <div style={messageStyle}>
        {error?.message ?? 'An unexpected error occurred.'}
      </div>
      {isDev && error?.stack && (
        <pre style={stackStyle}>{error.stack}</pre>
      )}
      <button style={buttonStyle} onClick={onReset}>
        Try Again
      </button>
    </div>
  );
}

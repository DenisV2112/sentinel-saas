import { palette } from '@utils/theme/colors';

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

export default function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  const cardStyle: React.CSSProperties = {
    background: palette.colors.layout.surface,
    border: `1px solid ${palette.colors.layout.border}`,
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '600px',
    margin: '40px auto',
    textAlign: 'center',
  };

  const titleStyle: React.CSSProperties = {
    color: palette.colors.layout.danger,
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '12px',
  };

  const messageStyle: React.CSSProperties = {
    color: palette.colors.layout.text.secondary,
    fontSize: '14px',
    marginBottom: '16px',
  };

  const stackStyle: React.CSSProperties = {
    background: palette.colors.layout.secondaryDark,
    border: `1px solid ${palette.colors.layout.borderDark}`,
    borderRadius: '8px',
    padding: '12px',
    color: palette.colors.layout.text.tertiary,
    fontSize: '12px',
    fontFamily: 'monospace',
    textAlign: 'left',
    overflow: 'auto',
    maxHeight: '200px',
    marginBottom: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    background: palette.colors.layout.primary,
    color: palette.colors.layout.onPrimary,
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

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: 'var(--color-success)',
            secondary: 'var(--color-on-primary)',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: 'var(--color-danger)',
            secondary: 'var(--color-on-primary)',
          },
        },
      }}
      containerStyle={{
        zIndex: 9999,
      }}
    />
  );
}

import { Toaster } from 'react-hot-toast';
import { palette } from '@utils/theme/colors';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: palette.colors.layout.surface,
          color: palette.colors.layout.text.primary,
          border: `1px solid ${palette.colors.layout.border}`,
          borderRadius: '8px',
          fontSize: '14px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: palette.colors.layout.success,
            secondary: palette.colors.layout.onPrimary,
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: palette.colors.layout.danger,
            secondary: palette.colors.layout.onPrimary,
          },
        },
      }}
      containerStyle={{
        zIndex: 9999,
      }}
    />
  );
}

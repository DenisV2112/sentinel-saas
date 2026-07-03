import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeConfig, ThemeMode, darkTheme, lightTheme } from '../theme/theme';

interface ThemeContextType {
  theme: ThemeConfig;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyThemeVariables(theme: ThemeConfig) {
  const root = document.documentElement.style;
  const c = theme.colors;
  root.setProperty('--color-primary', c.primary);
  root.setProperty('--color-primary-light', c.primaryLight ?? c.primary);
  root.setProperty('--color-primary-dark', c.primaryDark ?? c.primary);
  root.setProperty('--color-on-primary', c.onPrimary ?? '#FFFFFF');
  root.setProperty('--color-secondary', c.secondary);
  root.setProperty('--color-secondary-light', c.secondaryLight ?? c.secondary);
  root.setProperty('--color-secondary-dark', c.secondaryDark ?? c.secondary);
  root.setProperty('--color-background', c.background);
  root.setProperty('--color-surface', c.surface);
  root.setProperty('--color-surface-light', c.surfaceLight ?? c.surface);
  root.setProperty('--color-on-surface', c.onSurface ?? '#FFFFFF');
  root.setProperty('--color-text-primary', c.text.primary);
  root.setProperty('--color-text-secondary', c.text.secondary);
  root.setProperty('--color-text-tertiary', c.text.tertiary);
  root.setProperty('--color-border', c.border);
  root.setProperty('--color-border-light', c.borderLight ?? c.border);
  root.setProperty('--color-border-dark', c.borderDark ?? c.border);
  root.setProperty('--color-success', c.success);
  root.setProperty('--color-warning', c.warning);
  root.setProperty('--color-danger', c.danger);
  root.setProperty('--color-on-danger', c.onDanger ?? '#FFFFFF');
  root.setProperty('--color-info', c.info);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'dark';
  });

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.style.colorScheme = mode;
    applyThemeVariables(theme);
  }, [mode, theme]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');
  }
  return context;
};

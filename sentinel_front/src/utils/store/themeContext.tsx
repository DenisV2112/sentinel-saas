import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  onPrimary: string;
  surface: string;
  surfaceLight: string;
  onSurface: string;
  background: string;
  text: { primary: string; secondary: string; tertiary: string };
  border: string;
  borderLight: string;
  borderDark: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  onDanger: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  mode: ThemeMode;
}

interface ThemeContextType {
  theme: ThemeConfig;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

/* CSS-variable-backed theme — inline styles resolve to current data-theme */
const cssTheme: ThemeConfig = {
  mode: 'dark',
  colors: {
    primary: 'var(--color-primary)',
    primaryLight: 'var(--color-primary-light)',
    primaryDark: 'var(--color-primary-dark)',
    secondary: 'var(--color-secondary)',
    onPrimary: 'var(--color-on-primary)',
    surface: 'var(--color-surface)',
    surfaceLight: 'var(--color-surface-light)',
    onSurface: 'var(--color-on-surface)',
    background: 'var(--color-background)',
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      tertiary: 'var(--color-text-tertiary)',
    },
    border: 'var(--color-border)',
    borderLight: 'var(--color-border-light)',
    borderDark: 'var(--color-border-dark)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
    onDanger: 'var(--color-on-danger)',
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme-mode', mode);
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const contextValue = useMemo<ThemeContextType>(() => ({
    theme: { ...cssTheme, mode },
    mode,
    toggleTheme: () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    setTheme: (newMode: ThemeMode) => setMode(newMode),
  }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
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

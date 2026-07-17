import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

/* Polyfill TextEncoder for jsdom + react-router */
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder: TE, TextDecoder: TD } = require('util');
  (global as any).TextEncoder = TE;
  (global as any).TextDecoder = TD;
}

/* Mock framer-motion (avoids animation issues in jsdom) */
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('react');
  const motionDiv = ({ children, ...props }: any) => actual.createElement('div', props, children);
  const motionSection = ({ children, ...props }: any) => actual.createElement('section', props, children);
  const motionH1 = ({ children, ...props }: any) => actual.createElement('h1', props, children);
  const motionH2 = ({ children, ...props }: any) => actual.createElement('h2', props, children);
  return {
    motion: { div: motionDiv, section: motionSection, h1: motionH1, h2: motionH2 },
    AnimatePresence: ({ children }: any) => children,
  };
});

/* Mock Sidebar (renders just children — we test theme toggle, not sidebar) */
jest.mock('@/components/commons/Sidebar', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sidebar">{children}</div>,
}));

import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@utils/store/themeContext';
import SettingsPage from '@pages/SettingsPage';

function renderSettings() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <SettingsPage />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('SettingsPage', () => {
  it('renders theme toggle buttons with aria-labels', () => {
    renderSettings();

    const darkBtn = screen.getByRole('button', { name: /dark/i });
    const lightBtn = screen.getByRole('button', { name: /light/i });

    expect(darkBtn).toBeInTheDocument();
    expect(lightBtn).toBeInTheDocument();
    expect(darkBtn.getAttribute('aria-label')).toBeTruthy();
    expect(lightBtn.getAttribute('aria-label')).toBeTruthy();
  });

  it('calls setTheme when dark button is clicked', () => {
    renderSettings();

    /* Set to light first so we can observe a change */
    act(() => { screen.getByRole('button', { name: /light/i }).click(); });
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => { screen.getByRole('button', { name: /dark/i }).click(); });
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('calls setTheme when light button is clicked', () => {
    renderSettings();

    act(() => { screen.getByRole('button', { name: /light/i }).click(); });
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

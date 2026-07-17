import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useTheme } from '@utils/store/themeContext';

/* Test consumer component */
function ThemeDisplay() {
  const { mode, toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Dark</button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Light</button>
    </div>
  );
}

function renderTheme() {
  return render(
    <ThemeProvider>
      <ThemeDisplay />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('sets data-theme attribute on document element', () => {
    renderTheme();
    const theme = document.documentElement.dataset.theme;
    expect(theme).toBeDefined();
    expect(['dark', 'light']).toContain(theme);
  });

  it('toggles theme mode and updates data-theme attribute', () => {
    renderTheme();
    const initialMode = screen.getByTestId('mode').textContent;
    const initialTheme = document.documentElement.dataset.theme;

    act(() => { screen.getByTestId('toggle').click(); });

    const newMode = screen.getByTestId('mode').textContent;
    const newTheme = document.documentElement.dataset.theme;

    expect(newMode).not.toBe(initialMode);
    expect(newTheme).not.toBe(initialTheme);
    expect(newTheme).toBe(newMode);
  });

  it('setTheme changes data-theme attribute', () => {
    renderTheme();

    act(() => { screen.getByTestId('set-light').click(); });
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    act(() => { screen.getByTestId('set-dark').click(); });
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists mode to localStorage', () => {
    renderTheme();

    act(() => { screen.getByTestId('set-light').click(); });
    expect(localStorage.getItem('theme-mode')).toBe('light');

    act(() => { screen.getByTestId('set-dark').click(); });
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });
});

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

/* Polyfill TextEncoder */
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder: TE } = require('util');
  (global as any).TextEncoder = TE;
}

/* Mock framer-motion */
jest.mock('framer-motion', () => {
  const R = jest.requireActual('react');
  const el = (tag: string) => ({ children, ...props }: any) => R.createElement(tag, props, children);
  return {
    motion: { div: el('div'), h1: el('h1'), p: el('p'), section: el('section'), span: el('span'), form: el('form'), input: el('input'), button: el('button'), a: el('a'), i: el('i') },
    AnimatePresence: ({ children }: any) => children,
  };
});

/* Mock Navbar */
jest.mock('@/components/commons/Navbar', () => ({
  Navbar: () => <nav data-testid="navbar">Navbar</nav>,
}));

/* Mock react-router-dom */
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

/* Mock toast */
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import AuthPage from '@pages/AuthPage';

describe('AuthPage', () => {
  it('does not crash on import — ghost auth.api removed', () => {
    /* If we get here without "Could not locate module" error, the ghost import is gone */
    expect(() => render(<AuthPage />)).not.toThrow();
  });

  it('renders the login form heading', () => {
    render(<AuthPage />);
    const headings = screen.getAllByText('Login');
    expect(headings.length).toBeGreaterThanOrEqual(2); /* form h1 + toggle button */
  });

  it('renders the registration form heading', () => {
    render(<AuthPage />);
    expect(screen.getByText('Registration')).toBeInTheDocument();
  });
});

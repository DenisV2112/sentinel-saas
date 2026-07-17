import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

/* Polyfill TextEncoder */
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder: TE } = require('util');
  (global as any).TextEncoder = TE;
}

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  NavLink: ({ children, to, style: _s, className: _c, ...rest }: any) => (
    <a href={to} {...rest}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
}));

/* Mock lucide icons */
jest.mock('lucide-react', () => ({
  ShieldCheck: () => <span>ShieldCheck</span>,
  LayoutDashboard: () => <span>Dashboard</span>,
  Radar: () => <span>Radar</span>,
  Folder: () => <span>Folder</span>,
  Bug: () => <span>Bug</span>,
  Bell: () => <span>Bell</span>,
  Settings: () => <span>Settings</span>,
  LogOut: () => <span>LogOut</span>,
  CreditCard: () => <span>CreditCard</span>,
}));

import Sidebar from '@/components/commons/Sidebar';

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mockNavigate.mockReset();
});

function setLoggedInState() {
  localStorage.setItem('accessToken', 'mock-access-token');
  localStorage.setItem('refreshToken', 'mock-refresh-token');
  localStorage.setItem('userId', 'user-1');
  localStorage.setItem('tenantId', 'tenant-1');
  sessionStorage.setItem('user', JSON.stringify({ name: 'Test User' }));
  sessionStorage.setItem('token', 'session-token');
}

describe('Sidebar accessibility', () => {
  it('nav links have aria-labels for screen reader support in collapsed state', () => {
    setLoggedInState();
    render(<Sidebar activeItem="dashboard" />);

    const expectedLabels: Record<string, string> = {
      Dashboard: 'Dashboard',
      Scans: 'Scans',
      Workspaces: 'Workspaces',
      Findings: 'Findings',
      Billing: 'Billing',
      Settings: 'Settings',
    };

    for (const [label, ariaLabel] of Object.entries(expectedLabels)) {
      const link = screen.getByRole('link', { name: ariaLabel });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('aria-label')).toBe(label);
    }
  });

  it('logout button has accessible label', () => {
    setLoggedInState();
    render(<Sidebar activeItem="dashboard" />);

    const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
    expect(logoutBtn).toBeInTheDocument();
    expect(logoutBtn.getAttribute('aria-label')).toBe('Cerrar sesión');
  });
});

describe('Sidebar logout', () => {
  it('clears localStorage tokens on logout', () => {
    setLoggedInState();
    render(<Sidebar activeItem="dashboard" />);

    /* Click the logout button (icon-only, title="Cerrar sesión") */
    fireEvent.click(screen.getByTitle('Cerrar sesión'));

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(localStorage.getItem('tenantId')).toBeNull();
  });

  it('clears sessionStorage on logout', () => {
    setLoggedInState();
    render(<Sidebar activeItem="dashboard" />);

    fireEvent.click(screen.getByTitle('Cerrar sesión'));

    expect(sessionStorage.getItem('user')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('redirects to /auth after logout', () => {
    setLoggedInState();
    render(<Sidebar activeItem="dashboard" />);

    fireEvent.click(screen.getByTitle('Cerrar sesión'));

    expect(mockNavigate).toHaveBeenCalledWith('/auth');
  });
});

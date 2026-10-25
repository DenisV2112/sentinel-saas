import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ──────────────────────────────────────────────────────
const mockRefetch = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('framer-motion', () => {
  const R = jest.requireActual('react');
  const el = (tag: string) => ({ children, initial, animate, exit, transition, whileHover, whileTap, layout, ...props }: any) =>
    R.createElement(tag, props, children);
  return { motion: { div: el('div'), button: el('button') }, AnimatePresence: ({ children }: any) => children };
});

jest.mock('@/components/commons/Sidebar', () => ({ __esModule: true, default: () => <aside /> }));
jest.mock('@/ui/components/ProjectsList', () => ({ ProjectsList: () => null }));
jest.mock('@/ui/components/UpgradePlanModal', () => ({ __esModule: true, default: () => null }));
jest.mock('@/ui/components/LimitReachedModal', () => ({ __esModule: true, default: () => null }));

jest.mock('@hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({
    data: undefined,
    isLoading: false,
    error: new Error('HTTP 500: Internal Server Error'),
    refetch: mockRefetch,
  }),
  useCreateWorkspace: () => ({ createWorkspace: jest.fn(), isLoading: false, upgradeRequired: false }),
}));

jest.mock('@hooks/useBilling', () => ({
  useSubscription: () => ({ data: null }),
}));

import WorkspacesPage from '@pages/WorkspacesPage';

describe('WorkspacesPage', () => {
  it('shows the error message instead of crashing when workspaces fail to load', () => {
    render(<WorkspacesPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 500: Internal Server Error');
  });

  it('retry button refetches workspaces', () => {
    render(<WorkspacesPage />);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(mockRefetch).toHaveBeenCalled();
  });
});

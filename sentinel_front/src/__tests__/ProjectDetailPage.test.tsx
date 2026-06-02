import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockUseParams = jest.fn(() => ({ projectId: 'proj-abc' }));
const mockTheme = {
  colors: {
    background: '#f5f5f5',
    surface: '#ffffff',
    primary: '#3b82f6',
    onPrimary: '#ffffff',
    danger: '#ef4444',
    text: { primary: '#111', secondary: '#666' },
    border: '#e5e7eb',
  },
};

const mockUseProjects = jest.fn(() => ({
  projects: [],
  projectsMap: new Map(),
  loading: false,
  error: null,
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  refetch: jest.fn(),
}));

const mockUseScans = jest.fn(() => ({
  scans: [],
  loading: false,
  error: null,
  fetchScans: jest.fn(),
  refetchScans: jest.fn(),
  startScan: jest.fn(),
  getScan: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/components/commons/Sidebar', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar">{children}</div>
  ),
}));

jest.mock('@/hooks/useProjects', () => ({
  useProjects: (...args: any[]) => mockUseProjects(...args),
}));

jest.mock('@/hooks/useScans', () => ({
  useScans: () => mockUseScans(),
}));

jest.mock('@/utils/store/themeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

// ── Dynamic import to trigger mocked hooks ─────────────────────
let ProjectDetailPage: React.ComponentType;
beforeAll(async () => {
  const mod = await import('@/ui/pages/ProjectDetailPage');
  ProjectDetailPage = mod.ProjectDetailPage;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseParams.mockReturnValue({ projectId: 'proj-abc' });
  mockUseProjects.mockReturnValue({
    projects: [],
    projectsMap: new Map(),
    loading: false,
    error: null,
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    refetch: jest.fn(),
  });
  mockUseScans.mockReturnValue({
    scans: [],
    loading: false,
    error: null,
    fetchScans: jest.fn(),
    refetchScans: jest.fn(),
    startScan: jest.fn(),
    getScan: jest.fn(),
  });
  mockNavigate.mockReset();
  localStorage.clear();
  (global.fetch as any) = undefined;
});

// ── Helpers ────────────────────────────────────────────────────
const renderPage = () => render(<ProjectDetailPage />);

// ══════════════════════════════════════════════════════════════
// SCENARIO: Reads correct localStorage key
// ══════════════════════════════════════════════════════════════
describe('ProjectDetailPage — localStorage key', () => {
  it('reads tenantId (not selectedTenantId) from localStorage', async () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    localStorage.setItem('tenantId', 'tenant-uuid');

    renderPage();

    // Wait for effects to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(getItemSpy).toHaveBeenCalledWith('tenantId');
    // selectedTenantId should NEVER be called
    const selectedCalls = getItemSpy.mock.calls.filter(
      ([key]) => key === 'selectedTenantId'
    );
    expect(selectedCalls).toHaveLength(0);

    getItemSpy.mockRestore();
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Project not found (404)
// ══════════════════════════════════════════════════════════════
describe('ProjectDetailPage — 404 Project not found', () => {
  it('shows error card with "Project not found" when API returns 404', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    global.fetch = mockFetch;
    localStorage.setItem('tenantId', 'tenant-1');
    localStorage.setItem('accessToken', 'token');

    renderPage();

    // Use getByRole('heading') to avoid matching both heading + error text
    await waitFor(
      () => {
        const heading = screen.getByRole('heading', { name: /Project not found/i });
        expect(heading).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Spinner MUST stop — no "Loading project" text
    expect(screen.queryByText(/Loading project/i)).not.toBeInTheDocument();

    // Error detail should be visible
    expect(screen.getByText(/Project not found or access denied/i)).toBeInTheDocument();
  });

  it('shows "Back to Projects" button on 404 card', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    global.fetch = mockFetch;
    localStorage.setItem('tenantId', 'tenant-1');
    localStorage.setItem('accessToken', 'token');

    renderPage();

    await waitFor(() => {
      const backBtn = screen.getByRole('button', { name: /back/i });
      expect(backBtn).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Network error with retry
// ══════════════════════════════════════════════════════════════
describe('ProjectDetailPage — network error', () => {
  it('shows error card with Retry button on fetch rejection', async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new Error('Network failure'));
    global.fetch = mockFetch;
    localStorage.setItem('tenantId', 'tenant-1');
    localStorage.setItem('accessToken', 'token');

    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Retry button should be visible
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it('clicking Retry re-fetches the project', async () => {
    const mockFetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'proj-abc',
          name: 'Recovered Project',
          description: 'It worked',
          tenantId: 'tenant-1',
          status: 'ACTIVE',
          createdAt: '2026-01-01',
        }),
      });
    global.fetch = mockFetch;
    localStorage.setItem('tenantId', 'tenant-1');
    localStorage.setItem('accessToken', 'token');

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Should have called fetch twice (first failed, second on retry)
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // After successful retry, project name should appear
    await waitFor(() => {
      expect(screen.getByText('Recovered Project')).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Successful load
// ══════════════════════════════════════════════════════════════
describe('ProjectDetailPage — successful load', () => {
  it('displays project name as page title on successful fetch', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'proj-abc',
        name: 'Security Scanner',
        description: 'Main security scanning project',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        createdAt: '2026-01-15',
      }),
    });
    global.fetch = mockFetch;
    localStorage.setItem('tenantId', 'tenant-1');
    localStorage.setItem('accessToken', 'token');

    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText('Security Scanner')).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Description should also be visible
    expect(screen.getByText('Main security scanning project')).toBeInTheDocument();
  });

  it('does NOT show spinner after successful load', async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'proj-abc',
        name: 'Test',
        description: '',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      }),
    });
    global.fetch = mockFetch;
    localStorage.setItem('tenantId', 'tenant-1');
    localStorage.setItem('accessToken', 'token');

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Loading project/i)).not.toBeInTheDocument();
  });
});

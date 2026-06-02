import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
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

const mockUseActiveScans = jest.fn(() => ({
  data: [],
  loading: false,
  error: null,
}));

const mockUseRecentScans = jest.fn(() => ({
  data: [],
  loading: false,
  error: null,
}));

const mockUseProjects = jest.fn(() => ({
  projects: [],
  projectsMap: new Map(),
  loading: false,
  error: null,
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  refetch: jest.fn(),
}));

const mockRefreshScans = jest.fn();
const mockStartScan = jest.fn();

const mockUseScans = jest.fn(() => ({
  scans: [],
  loading: false,
  error: null,
  fetchScans: jest.fn(),
  refetchScans: mockRefreshScans,
  startScan: mockStartScan,
  getScan: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('@/hooks/useDashboard', () => ({
  useActiveScans: () => mockUseActiveScans(),
  useRecentScans: () => mockUseRecentScans(),
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

jest.mock('@/components/commons/Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

// ── Dynamic import ─────────────────────────────────────────────
let ScansPage: React.ComponentType;
beforeAll(async () => {
  const mod = await import('@/ui/pages/ScanPanel');
  ScansPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseActiveScans.mockReturnValue({ data: [], loading: false, error: null });
  mockUseRecentScans.mockReturnValue({ data: [], loading: false, error: null });
  mockUseProjects.mockReturnValue({
    projects: [],
    projectsMap: new Map(),
    loading: false,
    error: null,
    createProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    refetch: jest.fn(),
  });
  mockUseScans.mockReturnValue({
    scans: [],
    loading: false,
    error: null,
    fetchScans: jest.fn(),
    refetchScans: mockRefreshScans,
    startScan: mockStartScan,
    getScan: jest.fn(),
  });
  mockNavigate.mockReset();
  mockStartScan.mockReset();
  mockRefreshScans.mockReset();
  localStorage.clear();
  localStorage.setItem('tenantId', 'tenant-1');
  localStorage.setItem('accessToken', 'token');
});

const renderPage = () => render(<ScansPage />);

// ══════════════════════════════════════════════════════════════
// SCENARIO: Project dropdown populates from useProjects data
// ══════════════════════════════════════════════════════════════
describe('ScanPanel — project dropdown', () => {
  it('populates project dropdown from useProjects data', () => {
    mockUseProjects.mockReturnValue({
      projects: [
        { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' },
        { id: 'p2', name: 'Project Beta', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' },
      ],
      projectsMap: new Map([
        ['p1', { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' }],
        ['p2', { id: 'p2', name: 'Project Beta', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' }],
      ]),
      loading: false,
      error: null,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      refetch: jest.fn(),
    });

    renderPage();

    // Click "New Scan" to show the form
    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));

    // Verify project options appear
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });

  it('shows empty dropdown when tenant has no projects', () => {
    mockUseProjects.mockReturnValue({
      projects: [],
      projectsMap: new Map(),
      loading: false,
      error: null,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      refetch: jest.fn(),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));

    // "Select Project" default option should still be present
    expect(screen.getByText('Select Project')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Form validation — disabled submit, inline message
// ══════════════════════════════════════════════════════════════
describe('ScanPanel — form validation', () => {
  it('submit button is disabled when no project selected', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));

    const submitBtn = screen.getByRole('button', { name: /start new scan/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows "Select a project first" message when projectId is empty', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));

    expect(screen.getByText(/select a project first/i)).toBeInTheDocument();
  });

  it('submit button is enabled when a project is selected', () => {
    mockUseProjects.mockReturnValue({
      projects: [
        { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' },
      ],
      projectsMap: new Map([
        ['p1', { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' }],
      ]),
      loading: false,
      error: null,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      refetch: jest.fn(),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));

    // Select a project from dropdown (first <select>)
    const selects = screen.getAllByRole('combobox');
    const projectSelect = selects[0];
    fireEvent.change(projectSelect, { target: { value: 'p1' } });

    const submitBtn = screen.getByRole('button', { name: /start new scan/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it('"Select a project first" message disappears when project selected', () => {
    mockUseProjects.mockReturnValue({
      projects: [
        { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' },
      ],
      projectsMap: new Map([
        ['p1', { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' }],
      ]),
      loading: false,
      error: null,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      refetch: jest.fn(),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));
    expect(screen.getByText(/select a project first/i)).toBeInTheDocument();

    // Select a project
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p1' } });

    // Validation message should now be gone
    expect(screen.queryByText(/select a project first/i)).not.toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: handleViewReport navigates to scan detail
// ══════════════════════════════════════════════════════════════
describe('ScanPanel — View Report navigation', () => {
  it('navigates to /scans/:scanId when View Report is clicked', () => {
    mockUseRecentScans.mockReturnValue({
      data: [{
        scanId: 'scan-abc',
        projectName: 'Test Project',
        scanType: 'SAST',
        status: 'COMPLETED',
        qualityGatePassed: true,
        completedAt: '2026-06-01T10:00:00Z',
      }],
      loading: false,
      error: null,
    });

    renderPage();

    const viewBtn = screen.getByRole('button', { name: /view report/i });
    fireEvent.click(viewBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/scans/scan-abc');
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Successful scan creation refetches scan list
// ══════════════════════════════════════════════════════════════
describe('ScanPanel — auto-refetch after scan creation', () => {
  it('calls refetchScans after successful startScan', async () => {
    mockStartScan.mockResolvedValueOnce({ id: 'new-scan', status: 'RUNNING' });

    mockUseProjects.mockReturnValue({
      projects: [
        { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' },
      ],
      projectsMap: new Map([
        ['p1', { id: 'p1', name: 'Project Alpha', description: '', tenantId: 't1', domainCount: 0, repoCount: 0, createdAt: '' }],
      ]),
      loading: false,
      error: null,
      createProject: jest.fn(),
      updateProject: jest.fn(),
      deleteProject: jest.fn(),
      refetch: jest.fn(),
    });

    renderPage();

    // Open form
    fireEvent.click(screen.getByRole('button', { name: /new scan/i }));

    // Select a project
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'p1' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /start new scan/i }));

    // Wait for async to settle, then verify refetch was called
    await new Promise((r) => setTimeout(r, 100));

    expect(mockRefreshScans).toHaveBeenCalled();
  });
});

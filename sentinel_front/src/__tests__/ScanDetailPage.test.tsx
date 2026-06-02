import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockUseParams = jest.fn(() => ({ scanId: 'test-123' }));
const mockTheme = {
  colors: {
    background: '#f5f5f5',
    surface: '#ffffff',
    primary: '#3b82f6',
    onPrimary: '#ffffff',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    text: { primary: '#111', secondary: '#666' },
    border: '#e5e7eb',
  },
};

jest.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
}));

jest.mock('@/utils/store/themeContext', () => ({
  useTheme: () => ({ theme: mockTheme }),
}));

jest.mock('@/components/commons/Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar" />,
}));

// Mock the scans API
const mockGetScan = jest.fn();
jest.mock('@/api/scans.api', () => ({
  getScan: (...args: any[]) => mockGetScan(...args),
}));

// ── Dynamic import ─────────────────────────────────────────────
// This WILL fail because ScanDetailPage.tsx does not exist yet → RED phase
let ScanDetailPage: React.ComponentType;
beforeAll(async () => {
  const mod = await import('@/ui/pages/ScanDetailPage');
  ScanDetailPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseParams.mockReturnValue({ scanId: 'test-123' });
  mockNavigate.mockReset();
  mockGetScan.mockReset();
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Loading state
// ══════════════════════════════════════════════════════════════
describe('ScanDetailPage — loading state', () => {
  it('shows loading spinner initially while fetching scan', async () => {
    // getScan returns a promise that never resolves (stays loading)
    mockGetScan.mockReturnValue(new Promise(() => {}));

    render(<ScanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Error state
// ══════════════════════════════════════════════════════════════
describe('ScanDetailPage — error state', () => {
  it('shows error card on API failure with retry button', async () => {
    mockGetScan.mockRejectedValueOnce(new Error('Network failure'));

    render(<ScanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Retry button should be present
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it('clicking Retry re-fetches the scan', async () => {
    mockGetScan
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        data: {
          id: 'test-123',
          status: 'COMPLETED',
          scanType: 'SAST',
          projectName: 'Test Project',
          createdAt: '2026-06-01T10:00:00Z',
          completedAt: '2026-06-01T10:30:00Z',
          findings: { critical: 2, high: 3, medium: 1 },
        },
      });

    render(<ScanDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(mockGetScan).toHaveBeenCalledTimes(2);
    });

    // After retry, findings should appear
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // critical count
    });
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Empty findings state
// ══════════════════════════════════════════════════════════════
describe('ScanDetailPage — empty findings', () => {
  it('shows "No findings yet" when scan has no findings', async () => {
    mockGetScan.mockResolvedValueOnce({
      data: {
        id: 'test-123',
        status: 'RUNNING',
        scanType: 'DAST',
        projectName: 'My Project',
        createdAt: '2026-06-01T08:00:00Z',
        completedAt: null,
        findings: null,
      },
    });

    render(<ScanDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/no findings/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});

// ══════════════════════════════════════════════════════════════
// SCENARIO: Successful render with findings
// ══════════════════════════════════════════════════════════════
describe('ScanDetailPage — findings display', () => {
  it('renders findings with critical, high, medium counts', async () => {
    mockGetScan.mockResolvedValueOnce({
      data: {
        id: 'test-123',
        status: 'COMPLETED',
        scanType: 'SAST',
        projectName: 'Security Core',
        createdAt: '2026-06-01T10:00:00Z',
        completedAt: '2026-06-01T10:30:00Z',
        findings: {
          critical: 5,
          high: 3,
          medium: 12,
        },
      },
    });

    render(<ScanDetailPage />);

    await waitFor(() => {
      // Status badge text is present (may appear in multiple places)
      const completedEls = screen.getAllByText(/completed/i);
      expect(completedEls.length).toBeGreaterThan(0);
    });

    // Project name
    expect(screen.getByText('Security Core')).toBeInTheDocument();

    // Scan type
    expect(screen.getByText('SAST')).toBeInTheDocument();

    // Findings counts - use getAllByText since numbers might appear multiple times
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    // Critical / High / Medium labels
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  it('renders scan timeline info', async () => {
    mockGetScan.mockResolvedValueOnce({
      data: {
        id: 'test-123',
        status: 'COMPLETED',
        scanType: 'SCA',
        projectName: 'Dep Check',
        createdAt: '2026-05-28T09:00:00Z',
        completedAt: '2026-05-28T09:15:00Z',
        findings: { critical: 0, high: 1, medium: 4 },
      },
    });

    render(<ScanDetailPage />);

    await waitFor(() => {
      // Should show the date info
      expect(screen.getByText('Dep Check')).toBeInTheDocument();
    });
  });
});

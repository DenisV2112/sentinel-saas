import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardSummary, useActiveScans, useRecentScans } from '@hooks/useDashboard';
import type { ReactNode } from 'react';

const mockToken = 'test-jwt-token';
let mockFetch: jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockFetch = jest.fn();
  global.fetch = mockFetch;
  localStorage.setItem('accessToken', mockToken);
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
  (global.fetch as any) = undefined;
});

describe('useDashboardSummary', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stats: { totalProjects: 3, totalTenants: 1, totalScans: 12 },
        recentScans: [],
      }),
    });

    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('resolves summary with derived quality gate and nullable fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stats: { totalProjects: 5 },
        recentScans: [
          { id: '1', status: 'COMPLETED', qualityGatePassed: true },
          { id: '2', status: 'COMPLETED', qualityGatePassed: false },
          { id: '3', status: 'COMPLETED', qualityGate: 'PASS' },
          { id: '4', status: 'RUNNING' },
        ],
      }),
    });

    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({
      exposedPorts: undefined,
      criticalFindingsOpen: undefined,
      qualityGatePassRate: 67,
      projectsMonitored: 5,
    });
    expect(result.current.error).toBeNull();
  });

  it('sets qualityGatePassRate to undefined when no completed scans', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stats: { totalProjects: 1 },
        recentScans: [{ id: '1', status: 'RUNNING' }],
      }),
    });

    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.qualityGatePassRate).toBeUndefined();
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('handles non-200 HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('HTTP 500: Internal Server Error');
  });
});

describe('useActiveScans', () => {
  it('transforms scan response to ActiveScan format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { scanId: 's1', projectName: 'MyProject', type: 'SAST', status: 'RUNNING', elapsedTime: '02:30' },
        ],
      }),
    });

    const { result } = renderHook(() => useActiveScans(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toEqual({
      scanId: 's1',
      projectName: 'MyProject',
      scanType: 'SAST',
      status: 'RUNNING',
      statusMessage: 'Scanning...',
      elapsedTime: '02:30',
    });
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useActiveScans(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });
});

describe('useRecentScans', () => {
  it('transforms recent scan response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { scanId: 'scan-1', projectName: 'Repo', scanType: 'SAST', status: 'COMPLETED', qualityGatePassed: true, completedAt: '2026-01-01' },
        ],
      }),
    });

    const { result } = renderHook(() => useRecentScans(3), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toEqual({
      scanId: 'scan-1',
      projectName: 'Repo',
      scanType: 'SAST',
      status: 'COMPLETED',
      qualityGatePassed: true,
      completedAt: '2026-01-01',
    });
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRecentScans(3), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('sends X-Tenant-Id header when tenantId is in localStorage', async () => {
    localStorage.setItem('tenantId', 'tenant-uuid-123');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    });

    renderHook(() => useRecentScans(3), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Tenant-Id': 'tenant-uuid-123',
        }),
      }),
    );
  });

  it('does NOT send X-Tenant-Id header when tenantId is absent', async () => {
    localStorage.removeItem('tenantId');
    expect(localStorage.getItem('tenantId')).toBeNull();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [] }),
    });

    renderHook(() => useRecentScans(3), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const [, callOptions] = mockFetch.mock.calls[0];
    const headers = callOptions?.headers ?? {};
    expect(headers['X-Tenant-Id']).toBeUndefined();
  });
});

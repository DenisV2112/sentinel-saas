import { renderHook, waitFor, act } from '@testing-library/react';
import { useDashboardSummary, useActiveScans, useRecentScans } from '@hooks/useDashboard';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockToken = 'test-jwt-token';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.setItem('accessToken', mockToken);
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
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

    const { result } = renderHook(() => useDashboardSummary());

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
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

    const { result } = renderHook(() => useDashboardSummary());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      exposedPorts: undefined,       // requires BFF enhancement
      criticalFindingsOpen: undefined, // requires BFF enhancement
      qualityGatePassRate: 67,       // 2 PASS out of 3 COMPLETED → 67%
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

    const { result } = renderHook(() => useDashboardSummary());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.qualityGatePassRate).toBeUndefined();
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useDashboardSummary());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('calls BFF with auth token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ stats: { totalProjects: 1 }, recentScans: [] }),
    });

    renderHook(() => useDashboardSummary());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/bff/dashboard'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
      }),
    );
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

    const { result } = renderHook(() => useActiveScans());

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toEqual({
      scanId: 's1',
      projectName: 'MyProject',
      scanType: 'SAST',
      status: 'RUNNING',
      statusMessage: 'Scanning...',
      elapsedTime: '02:30',
    });
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

    const { result } = renderHook(() => useRecentScans(3));

    await act(async () => {
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toEqual({
      scanId: 'scan-1',
      projectName: 'Repo',
      scanType: 'SAST',
      status: 'COMPLETED',
      qualityGatePassed: true,
      completedAt: '2026-01-01',
    });
  });
});

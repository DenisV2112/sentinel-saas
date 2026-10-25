import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFindings } from '@hooks/useFindings';
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
  mockFetch = jest.fn();
  global.fetch = mockFetch;
  localStorage.setItem('accessToken', mockToken);
  localStorage.setItem('tenantId', 'tenant-1');
});

afterEach(() => {
  localStorage.clear();
  (global.fetch as any) = undefined;
});

const sampleScans = {
  content: [
    {
      id: 's1', scanId: 's1', status: 'COMPLETED',
      projectId: 'p1', tenantId: 't1', scanType: 'SAST',
      projectName: 'my-project', createdAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:05:00Z',
    },
    {
      id: 's2', scanId: 's2', status: 'COMPLETED',
      projectId: 'p1', tenantId: 't1', scanType: 'DAST',
      projectName: 'my-project', createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 's3', scanId: 's3', status: 'RUNNING',
      projectId: 'p1', tenantId: 't1', scanType: 'SAST',
      createdAt: '2026-01-03T00:00:00Z',
    },
  ],
};

describe('useFindings', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleScans });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.scans).toEqual([]);
  });

  it('fetches completed scans only and returns scan items', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleScans });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should return 2 completed scans, not 3 (s3 is RUNNING)
    expect(result.current.scans).toHaveLength(2);
    expect(result.current.scans[0].scanId).toBe('s1');
    expect(result.current.scans[0].status).toBe('COMPLETED');
    expect(result.current.scans[0].projectName).toBe('my-project');
    expect(result.current.scans[0].scanType).toBe('SAST');
    expect(result.current.scans[1].scanId).toBe('s2');
    expect(result.current.scans[1].scanType).toBe('DAST');

    // Should only make ONE fetch call (scans list, no per-scan results)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns empty scans array when no scans exist', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scans).toHaveLength(0);
  });

  it('returns empty scans array when no completed scans exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { id: 's1', status: 'RUNNING', scanId: 's1' },
          { id: 's2', status: 'PENDING', scanId: 's2' },
          { id: 's3', status: 'FAILED', scanId: 's3' },
        ],
      }),
    });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scans).toHaveLength(0);
  });

  it('handles error on scan fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toBe('Network failure');
    expect(result.current.scans).toEqual([]);
  });

  it('handles non-200 response on scan fetch', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toContain('500');
  });

  it('filters out non-completed scans', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { id: 's1', scanId: 's1', status: 'COMPLETED', createdAt: '2026-01-01T00:00:00Z' },
          { id: 's2', scanId: 's2', status: 'COMPLETED', createdAt: '2026-01-02T00:00:00Z' },
          { id: 's3', scanId: 's3', status: 'RUNNING', createdAt: '2026-01-03T00:00:00Z' },
          { id: 's4', scanId: 's4', status: 'FAILED', createdAt: '2026-01-04T00:00:00Z' },
        ],
      }),
    });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scans).toHaveLength(2);
    const scanIds = result.current.scans.map((s) => s.scanId);
    expect(scanIds).toContain('s1');
    expect(scanIds).toContain('s2');
    expect(scanIds).not.toContain('s3');
    expect(scanIds).not.toContain('s4');
  });

  it('handles items-based response shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: 's1', scanId: 's1', status: 'COMPLETED', createdAt: '2026-01-01T00:00:00Z' },
        ],
      }),
    });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scans).toHaveLength(1);
    expect(result.current.scans[0].scanId).toBe('s1');
  });

  it('handles flat-array response shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 's1', scanId: 's1', status: 'COMPLETED', createdAt: '2026-01-01T00:00:00Z' },
      ],
    });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scans).toHaveLength(1);
  });

  it('manages filter state locally', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filter).toEqual({ severity: null, status: null });

    act(() => { result.current.setFilter({ severity: 'CRITICAL' }); });
    expect(result.current.filter).toEqual({ severity: 'CRITICAL', status: null });

    act(() => { result.current.setFilter({ status: 'Open' }); });
    expect(result.current.filter).toEqual({ severity: 'CRITICAL', status: 'Open' });

    act(() => { result.current.setFilter({ severity: null }); });
    expect(result.current.filter).toEqual({ severity: null, status: 'Open' });
  });

  it('has working refetch function', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleScans });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scans).toHaveLength(0);

    await waitFor(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.scans).toHaveLength(2);
    });
  });

  it('sends shared auth headers and no "Bearer null" without a token', async () => {
    localStorage.removeItem('accessToken');
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['X-Tenant-Id']).toBe('tenant-1');
    expect(headers.Authorization).toBeUndefined();
    expect(Object.values(headers)).not.toContain('Bearer null');
  });
});

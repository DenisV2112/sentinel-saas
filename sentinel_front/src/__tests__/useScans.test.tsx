import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useScans, useScan } from '@hooks/useScans';
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
    { id: 's1', scanId: 's1', projectId: 'p1', tenantId: 't1', userId: 'u1', status: 'COMPLETED', scanType: 'SAST', createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    { scanId: 's2', projectId: 'p1', tenantId: 't1', userId: 'u1', status: 'RUNNING', scanType: 'DAST', createdAt: '2026-01-03', updatedAt: '2026-01-04' },
  ],
};

describe('useScans', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleScans });

    const { result } = renderHook(() => useScans('tenant-1'), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.scans).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches scans and normalizes ids', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleScans });

    const { result } = renderHook(() => useScans('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.scans).toHaveLength(2);
    expect(result.current.scans[0].id).toBe('s1');
    expect(result.current.scans[1].id).toBe('s2');
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when tenantId is null', () => {
    const { result } = renderHook(() => useScans(null), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.scans).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useScans('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.scans).toEqual([]);
  });

  it('handles non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    const { result } = renderHook(() => useScans('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('HTTP 500: Internal Server Error');
  });

  it('startScan mutation calls API with mapped request and invalidates', async () => {
    const scanResult = { id: 'new-scan', status: 'RUNNING' };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => scanResult });

    const { result } = renderHook(() => useScans('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let response: any;
    await act(async () => {
      response = await result.current.startScan({
        projectId: 'proj-1',
        scanType: 'SAST',
        targetRepo: 'https://github.com/user/repo',
      });
    });

    expect(response).toEqual(scanResult);
    expect(mockFetch.mock.calls[1][0]).toContain('/api/bff/scans/request');
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body).toEqual({
      type: 'SAST',
      targetUrl: undefined,
      targetRepo: 'https://github.com/user/repo',
      projectId: 'proj-1',
    });
    expect(mockFetch.mock.calls[1][1]?.method).toBe('POST');
  });
});

describe('useScan', () => {
  it('returns loading state initially for single scan', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 's1' }) });

    const { result } = renderHook(() => useScan('s1'), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('fetches single scan by id', async () => {
    const scanData = { id: 's1', status: 'COMPLETED' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => scanData });

    const { result } = renderHook(() => useScan('s1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(scanData);
  });

  it('returns null data when scanId is null', () => {
    const { result } = renderHook(() => useScan(null), { wrapper: createWrapper() });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

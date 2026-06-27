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
      projectId: 'p1', tenantId: 't1',
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 's2', scanId: 's2', status: 'COMPLETED',
      projectId: 'p1', tenantId: 't1',
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 's3', scanId: 's3', status: 'RUNNING',
      projectId: 'p1', tenantId: 't1',
      createdAt: '2026-01-03T00:00:00Z',
    },
  ],
};

const sampleResultsScan1 = {
  findings: [
    {
      id: 'f1', title: 'SQL Injection', severity: 'CRITICAL',
      description: 'SQL injection vulnerability found',
      file: 'app/login.ts', line: 42,
      solution: 'Use parameterized queries', cwe: 'CWE-89',
    },
    {
      id: 'f2', title: 'XSS Vulnerability', severity: 'HIGH',
      description: 'Cross-site scripting',
      file: 'app/ui.tsx', line: 15,
    },
  ],
};

const sampleResultsScan2 = {
  findings: [
    {
      id: 'f3', title: 'Info Leak', severity: 'MEDIUM',
      description: 'Sensitive data exposure',
      file: 'config.ts', line: 1,
    },
  ],
};

describe('useFindings', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleScans });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.findings).toEqual([]);
  });

  it('fetches findings from all completed scans and flattens them', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => sampleScans })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResultsScan1 })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResultsScan2 });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.findings).toHaveLength(3);

    // Finding from scan 1
    expect(result.current.findings[0].title).toBe('SQL Injection');
    expect(result.current.findings[0].severity).toBe('CRITICAL');
    expect(result.current.findings[0].file).toBe('app/login.ts');
    expect(result.current.findings[0].line).toBe(42);

    // Finding from scan 1
    expect(result.current.findings[1].title).toBe('XSS Vulnerability');
    expect(result.current.findings[1].severity).toBe('HIGH');

    // Finding from scan 2
    expect(result.current.findings[2].title).toBe('Info Leak');
    expect(result.current.findings[2].severity).toBe('MEDIUM');

    // Filter out RUNNING scan (s3) — no results fetched for it
    const scanIds = new Set(result.current.findings.map((f: any) => f.id.split('-')[1]));
    expect(scanIds.has('s3')).toBe(false);
  });

  it('returns empty array when no scans exist', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.findings).toHaveLength(0);
  });

  it('returns empty array when no completed scans exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [
          { id: 's1', status: 'RUNNING' },
          { id: 's2', status: 'PENDING' },
          { id: 's3', status: 'FAILED' },
        ],
      }),
    });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.findings).toHaveLength(0);
  });

  it('handles error on first fetch (scans)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toBe('Network failure');
    expect(result.current.findings).toEqual([]);
  });

  it('handles non-200 response on scans fetch', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toBe('Failed to load scans');
  });

  it('skips per-scan results that fail and returns remaining findings', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => sampleScans })
      .mockRejectedValueOnce(new Error('Failed scan 1 results')) // s1 fails
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResultsScan2 }); // s2 succeeds

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should only have findings from scan 2 (s1 failed)
    expect(result.current.findings).toHaveLength(1);
    expect(result.current.findings[0].title).toBe('Info Leak');
    // No error exposed because individual scan failures are skipped
    expect(result.current.error).toBeNull();
  });

  it('normalizes severity correctly', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => sampleScans })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          findings: [
            { id: 'f1', severity: 'ERROR', title: 'Err', description: '' },
            { id: 'f2', severity: 'WARNING', title: 'Warn', description: '' },
            { id: 'f3', severity: 'LOW', title: 'Low', description: '' },
            { id: 'f4', severity: 'UNKNOWN', title: 'Unknown', description: '' },
            { id: 'f5', title: 'Default', description: '' }, // no severity
          ],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ findings: [] }) });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.findings).toHaveLength(5);
    // ERROR maps to HIGH
    expect(result.current.findings[0].severity).toBe('HIGH');
    // WARNING maps to MEDIUM
    expect(result.current.findings[1].severity).toBe('MEDIUM');
    // LOW stays LOW
    expect(result.current.findings[2].severity).toBe('LOW');
    // UNKNOWN maps to INFO
    expect(result.current.findings[3].severity).toBe('INFO');
    // No severity defaults to INFO
    expect(result.current.findings[4].severity).toBe('INFO');
  });

  it('manages filter state locally', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Initial state
    expect(result.current.filter).toEqual({ severity: null, status: null });

    // Set severity
    act(() => { result.current.setFilter({ severity: 'CRITICAL' }); });
    expect(result.current.filter).toEqual({ severity: 'CRITICAL', status: null });

    // Set status
    act(() => { result.current.setFilter({ status: 'Open' }); });
    expect(result.current.filter).toEqual({ severity: 'CRITICAL', status: 'Open' });

    // Partial update preserves other values
    act(() => { result.current.setFilter({ severity: null }); });
    expect(result.current.filter).toEqual({ severity: null, status: 'Open' });
  });

  it('has working refetch function', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleScans })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResultsScan1 })
      .mockResolvedValueOnce({ ok: true, json: async () => sampleResultsScan2 });

    const { result } = renderHook(() => useFindings(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.findings).toHaveLength(0);

    await waitFor(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.findings).toHaveLength(3);
    });
  });
});

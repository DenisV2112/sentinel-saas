import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useFindingsByScan } from '@hooks/useFindingsByScan';

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

const sampleResults = {
  findings: [
    {
      id: 'f1',
      title: 'SQL Injection',
      severity: 'CRITICAL',
      description: 'SQL injection vulnerability found',
      file: 'app/login.ts',
      line: 42,
      solution: 'Use parameterized queries',
      cwe: 'CWE-89',
    },
    {
      id: 'f2',
      title: 'XSS Vulnerability',
      severity: 'HIGH',
      description: 'Cross-site scripting',
      file: 'app/ui.tsx',
      line: 15,
      cve: 'CVE-2024-1234',
    },
  ],
};

describe('useFindingsByScan', () => {
  it('does not fetch when enabled is false (default lazy behavior)', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleResults });

    const { result } = renderHook(() => useFindingsByScan('scan-1'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    // fetch should not have been called since enabled defaults to false
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches results for a single scan when enabled', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleResults });

    const { result } = renderHook(() => useFindingsByScan('scan-1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].title).toBe('SQL Injection');
    expect(result.current.data![0].severity).toBe('CRITICAL');
    expect(result.current.data![0].file).toBe('app/login.ts');
    expect(result.current.data![0].line).toBe(42);
    expect(result.current.data![0].cwe).toBe('CWE-89');

    expect(result.current.data![1].title).toBe('XSS Vulnerability');
    expect(result.current.data![1].cve).toBe('CVE-2024-1234');

    // Verify correct endpoint was called
    const expectedUrl = expect.stringContaining('/api/bff/scans/scan-1/results');
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockToken}`,
        }),
      })
    );
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useFindingsByScan('scan-1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('handles non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

    const { result } = renderHook(() => useFindingsByScan('scan-1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
    expect((result.current.error as Error).message).toContain('500');
  });

  it('does not fetch when scanId is null even if enabled', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleResults });

    renderHook(() => useFindingsByScan(null as any, true), {
      wrapper: createWrapper(),
    });

    // Should not fetch when scanId is null
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('normalizes findings from alternative response shapes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          findings: [
            { id: 'f1', severity: 'ERROR', title: 'Error finding', description: 'd' },
          ],
        },
      }),
    });

    const { result } = renderHook(() => useFindingsByScan('scan-1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    // ERROR normalizes to HIGH
    expect(result.current.data![0].severity).toBe('HIGH');
  });

  it('returns empty array when response has no findings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useFindingsByScan('scan-1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(0);
  });
});

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInvitations } from '@hooks/useInvitations';
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

const sampleInvitations: any[] = [
  { id: 'inv-1', email: 'alice@example.com', role: 'TENANT_USER', status: 'PENDING', createdAt: '2026-01-01', expiresAt: '2026-02-01' },
  { id: 'inv-2', email: 'bob@example.com', role: 'TENANT_ADMIN', status: 'PENDING', createdAt: '2026-01-02', expiresAt: '2026-02-02' },
];

describe('useInvitations', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.invitations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches invitations list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleInvitations });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(sampleInvitations);
    expect(result.current.invitations).toEqual(sampleInvitations);
    expect(result.current.error).toBeNull();
  });

  it('does not fetch when tenantId is null', () => {
    const { result } = renderHook(() => useInvitations(null), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.invitations).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.invitations).toEqual([]);
  });

  it('handles non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('HTTP 500: Internal Server Error');
  });

  it('inviteMember mutation sends POST and invalidates', async () => {
    const newInvitation = { id: 'inv-3', email: 'carol@example.com', role: 'TENANT_USER', status: 'PENDING', createdAt: '2026-03-01', expiresAt: '2026-04-01' };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => newInvitation });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: any;
    await act(async () => {
      created = await result.current.inviteMember('carol@example.com', 'TENANT_USER');
    });

    expect(created).toEqual(newInvitation);
    expect(mockFetch.mock.calls[1][0]).toContain('/api/tenants/tenant-1/invitations');
    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body).toEqual({ email: 'carol@example.com', role: 'TENANT_USER' });
    expect(mockFetch.mock.calls[1][1]?.method).toBe('POST');
  });

  it('inviteMember sends projectIds when provided', async () => {
    const newInvitation = { id: 'inv-4', email: 'dave@example.com', role: 'TENANT_USER', status: 'PENDING', createdAt: '2026-03-01', expiresAt: '2026-04-01' };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => newInvitation });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.inviteMember('dave@example.com', 'TENANT_USER', ['p1', 'p2']);
    });

    const body = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body.projectIds).toEqual(['p1', 'p2']);
  });

  it('inviteMember extracts error message from response body', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'User limit reached' }),
      });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let caughtError: any;
    try {
      await act(async () => {
        await result.current.inviteMember('carol@example.com', 'TENANT_USER');
      });
    } catch (e: any) {
      caughtError = e;
    }

    expect(caughtError).toBeDefined();
    expect(caughtError.message).toBe('User limit reached');
  });

  it('cancelInvitation removes item optimistically', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [...sampleInvitations] })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.invitations).toHaveLength(2);

    await act(async () => {
      await result.current.cancelInvitation('inv-1');
    });

    // After optimistic update + invalidation settles, the item should be gone.
    // Since mockFetch was already consumed by the first query and the mutation's
    // DELETE, the invalidation refetch will need a new mock response.
    // Wait for the invalidation refetch.
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [sampleInvitations[1]] });

    await waitFor(() => {
      expect(result.current.invitations).toHaveLength(1);
      expect(result.current.invitations[0].id).toBe('inv-2');
    });
  });

  it('cancelInvitation rolls back on error', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [...sampleInvitations] })
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useInvitations('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.invitations).toHaveLength(2);

    await act(async () => {
      try {
        await result.current.cancelInvitation('inv-1');
      } catch (e) {
        // Expected
      }
    });

    // After rollback + onSettled invalidation, the data should be restored.
    // The onSettled triggers an invalidation which refetches — mock that.
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [...sampleInvitations] });

    await waitFor(() => {
      expect(result.current.invitations).toHaveLength(2);
    });
  });
});

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useWorkspaces, useCreateWorkspace } from '@hooks/useWorkspaces';
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

/* ────────────────────────────────────────────────
   useWorkspaces()
   ──────────────────────────────────────────────── */
describe('useWorkspaces', () => {
  it('transforms dashboard tenants to workspace format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tenants: [
          {
            id: 't1',
            companyName: 'Acme Corp',
            description: 'Main workspace',
            plan: 'PRO',
            memberCount: 5,
            createdAt: '2026-01-01',
            updatedAt: '2026-06-01',
          },
          {
            // Using tenantId fallback + name fallback
            tenantId: 't2',
            name: 'Startup Inc',
            plan: 'FREE',
            memberCount: 2,
            createdAt: '2026-03-01',
          },
          {
            // No id/tenantId, no name/companyName, no memberCount
            plan: 'ENTERPRISE',
            createdAt: '2026-05-01',
          },
        ],
        projects: [
          { id: 'p1', tenantId: 't1', name: 'Project A' },
          { id: 'p2', tenantId: 't1', name: 'Project B' },
          { id: 'p3', tenantId: 't2', name: 'Project C' },
        ],
        stats: { totalTenants: 3, totalProjects: 3, totalScans: 5 },
      }),
    });

    const { result } = renderHook(() => useWorkspaces(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(3);
    expect(result.current.error).toBeNull();

    // t1: uses companyName, has 2 projects, uses updatedAt for lastActivity
    expect(result.current.data![0]).toEqual({
      id: 't1',
      name: 'Acme Corp',
      description: 'Main workspace',
      projectCount: 2,
      memberCount: 5,
      lastActivity: '2026-06-01',
      createdAt: '2026-01-01',
      plan: 'PRO',
    });

    // t2: uses tenantId and name, has 1 project (p3), falls back createdAt for lastActivity
    expect(result.current.data![1]).toEqual({
      id: 't2',
      name: 'Startup Inc',
      description: 'FREE Plan',
      projectCount: 1,
      memberCount: 2,
      lastActivity: '2026-03-01',
      createdAt: '2026-03-01',
      plan: 'FREE',
    });

    // t3: no id → fallback to undefined, no name → Workspace, no memberCount → 1
    expect(result.current.data![2].name).toBe('Workspace');
    expect(result.current.data![2].description).toBe('ENTERPRISE Plan');
    expect(result.current.data![2].memberCount).toBe(1);
    expect(result.current.data![2].plan).toBe('ENTERPRISE');
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkspaces(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.data).toBeUndefined();
  });

  it('handles non-200 HTTP response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useWorkspaces(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error?.message).toBe('HTTP 500: undefined');
    expect(result.current.data).toBeUndefined();
  });

  it('returns empty array when there are no tenants', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tenants: [],
        projects: [],
        stats: { totalTenants: 0, totalProjects: 0, totalScans: 0 },
      }),
    });

    const { result } = renderHook(() => useWorkspaces(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

/* ────────────────────────────────────────────────
   useCreateWorkspace()
   ──────────────────────────────────────────────── */
describe('useCreateWorkspace', () => {
  it('creates workspace and returns data on success', async () => {
    const created = { id: 'new-tenant', name: 'My Workspace' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => created,
    });

    const { result } = renderHook(() => useCreateWorkspace(), { wrapper: createWrapper() });

    let response: any;
    await act(async () => {
      response = await result.current.createWorkspace({ name: 'My Workspace', description: 'Test' });
    });

    expect(response).toEqual(created);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.upgradeRequired).toBe(false);

    // Verify correct POST to /api/tenants
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tenants'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        }),
        body: JSON.stringify({ name: 'My Workspace', type: 'PERSONAL' }),
      }),
    );
  });

  it('sets upgradeRequired on 402 Payment Required', async () => {
    const errorBody = { message: 'Upgrade required to create workspaces' };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => errorBody,
    });

    const { result } = renderHook(() => useCreateWorkspace(), { wrapper: createWrapper() });

    result.current.createWorkspace({ name: 'My Workspace' }).catch(() => {});

    await waitFor(() => {
      expect(result.current.upgradeRequired).toBe(true);
      expect(result.current.error).toBe('Upgrade required to create workspaces');
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('sets error on non-402 (400) failure without upgradeRequired', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request' }),
    });

    const { result } = renderHook(() => useCreateWorkspace(), { wrapper: createWrapper() });

    result.current.createWorkspace({ name: '' }).catch(() => {});

    await waitFor(() => {
      expect(result.current.error).toBe('Bad request');
    });

    expect(result.current.upgradeRequired).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('resets upgradeRequired and error between calls', async () => {
    // First call: 402
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({ message: 'Upgrade required' }),
    });

    const { result } = renderHook(() => useCreateWorkspace(), { wrapper: createWrapper() });

    result.current.createWorkspace({ name: 'First' }).catch(() => {});

    await waitFor(() => {
      expect(result.current.upgradeRequired).toBe(true);
    });

    // Second call: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 't2', name: 'Second' }),
    });

    result.current.createWorkspace({ name: 'Second' });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.upgradeRequired).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

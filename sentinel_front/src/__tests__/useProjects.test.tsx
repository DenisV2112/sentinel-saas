import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjects } from '@hooks/useProjects';
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

const sampleProjects = [
  { id: 'p1', name: 'Alpha', description: 'First', tenantId: 'tenant-1', domainCount: 2, repoCount: 1, createdAt: '2026-01-01' },
  { id: 'p2', name: 'Beta', description: 'Second', tenantId: 'tenant-1', domainCount: 5, repoCount: 3, createdAt: '2026-02-01' },
  { id: 'p3', name: 'Gamma', description: 'Third', tenantId: 'tenant-1', domainCount: 0, repoCount: 0, createdAt: '2026-03-01' },
];

describe('useProjects', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.projects).toEqual([]);
    expect(result.current.projectsMap.size).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('fetches projects and returns them', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleProjects });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(sampleProjects);
    expect(result.current.projects).toEqual(sampleProjects);
    expect(result.current.error).toBeNull();
  });

  it('returns projectsMap as Map<string, Project> for O(1) lookup', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => sampleProjects });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.projectsMap).toBeInstanceOf(Map);
    expect(result.current.projectsMap.get('p2')).toEqual(sampleProjects[1]);
    expect(result.current.projectsMap.get('nonexistent')).toBeUndefined();
    expect(result.current.projectsMap.size).toBe(3);
  });

  it('returns empty projectsMap when no tenant is provided', () => {
    const { result } = renderHook(() => useProjects(null), { wrapper: createWrapper() });

    expect(result.current.projectsMap).toBeInstanceOf(Map);
    expect(result.current.projectsMap.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.projects).toEqual([]);
  });

  it('handles non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('HTTP 500: Internal Server Error');
    expect(result.current.projects).toEqual([]);
  });

  it('preserves existing projects as array for backward compatibility', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [sampleProjects[0]] });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].name).toBe('Alpha');
    expect(result.current.projectsMap.get('p1')?.name).toBe('Alpha');
  });

  it('creates a project via mutation', async () => {
    const newProject = { id: 'p-new', name: 'New Project', description: 'Desc', tenantId: 'tenant-1', domainCount: 0, repoCount: 0, createdAt: '2026-06-01' };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => newProject });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let created: any;
    await act(async () => {
      created = await result.current.createProject({ name: 'New Project', description: 'Desc' });
    });

    expect(created).toEqual(newProject);
    expect(mockFetch.mock.calls[1][0]).toContain('/api/projects');
    expect(mockFetch.mock.calls[1][1]?.method).toBe('POST');
  });

  it('updates a project via mutation', async () => {
    const updatedProject = { ...sampleProjects[0], name: 'Updated Alpha' };

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleProjects[0]] })
      .mockResolvedValueOnce({ ok: true, json: async () => updatedProject });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let updated: any;
    await act(async () => {
      updated = await result.current.updateProject('p1', { name: 'Updated Alpha' });
    });

    expect(updated.name).toBe('Updated Alpha');
    expect(mockFetch.mock.calls[1][1]?.method).toBe('PUT');
  });

  it('deletes a project via mutation', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [sampleProjects[0], sampleProjects[1]] })
      .mockResolvedValueOnce({ ok: true, status: 204 });

    const { result } = renderHook(() => useProjects('tenant-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteProject('p1');
    });

    expect(mockFetch.mock.calls[1][0]).toContain('/api/projects/p1');
    expect(mockFetch.mock.calls[1][1]?.method).toBe('DELETE');
  });
});

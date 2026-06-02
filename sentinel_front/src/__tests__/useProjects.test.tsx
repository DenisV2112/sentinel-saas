import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '@hooks/useProjects';

const mockToken = 'test-jwt-token';
let mockFetch: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockFetch = jest.fn();
  global.fetch = mockFetch;
  localStorage.setItem('accessToken', mockToken);
  localStorage.setItem('tenantId', 'tenant-1');
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
  (global.fetch as any) = undefined;
});

describe('useProjects', () => {
  it('returns projectsMap as Map<string, Project> for O(1) lookup', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'p1', name: 'Alpha', description: 'First', tenantId: 'tenant-1', domainCount: 2, repoCount: 1, createdAt: '2026-01-01' },
        { id: 'p2', name: 'Beta', description: 'Second', tenantId: 'tenant-1', domainCount: 5, repoCount: 3, createdAt: '2026-02-01' },
        { id: 'p3', name: 'Gamma', description: 'Third', tenantId: 'tenant-1', domainCount: 0, repoCount: 0, createdAt: '2026-03-01' },
      ],
    });

    const { result } = renderHook(() => useProjects('tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // projectsMap should be a Map instance
    expect(result.current.projectsMap).toBeInstanceOf(Map);
    // O(1) lookup by project id
    expect(result.current.projectsMap.get('p2')).toEqual({
      id: 'p2', name: 'Beta', description: 'Second', tenantId: 'tenant-1', domainCount: 5, repoCount: 3, createdAt: '2026-02-01',
    });
    // Non-existent key returns undefined
    expect(result.current.projectsMap.get('nonexistent')).toBeUndefined();
    // Should have correct size
    expect(result.current.projectsMap.size).toBe(3);
  });

  it('returns empty projectsMap when no tenant is provided', () => {
    const { result } = renderHook(() => useProjects(null));

    expect(result.current.projectsMap).toBeInstanceOf(Map);
    expect(result.current.projectsMap.size).toBe(0);
  });

  it('exposes error state on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useProjects('tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.projectsMap.size).toBe(0);
  });

  it('exposes error state on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useProjects('tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load projects');
    expect(result.current.projectsMap.size).toBe(0);
  });

  it('preserves existing projects as array for backward compatibility', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'p1', name: 'Alpha', description: 'First', tenantId: 'tenant-1', domainCount: 2, repoCount: 1, createdAt: '2026-01-01' },
      ],
    });

    const { result } = renderHook(() => useProjects('tenant-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Array still works
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.projects[0].name).toBe('Alpha');
    // Map mirrors array
    expect(result.current.projectsMap.get('p1')?.name).toBe('Alpha');
  });
});

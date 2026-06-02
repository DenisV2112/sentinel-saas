import { renderHook, waitFor, act } from '@testing-library/react';
import { useScans } from '@hooks/useScans';

// Mock the scans API module
jest.mock('@/api/scans.api', () => ({
  getScans: jest.fn(),
  startScan: jest.fn(),
  getScan: jest.fn(),
}));

const mockGetScans = require('@/api/scans.api').getScans as jest.Mock;
const mockStartScan = require('@/api/scans.api').startScan as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.setItem('accessToken', 'test-jwt');
  localStorage.setItem('tenantId', 'tenant-1');
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
});

describe('useScans — fetchScans with tenantId', () => {
  it('passes tenantId to getScans API call', async () => {
    mockGetScans.mockResolvedValueOnce({
      data: { content: [] },
    });

    const { result } = renderHook(() => useScans());

    await act(async () => {
      await result.current.fetchScans('tenant-uuid-abc');
    });

    expect(mockGetScans).toHaveBeenCalledWith('tenant-uuid-abc');
  });
});

describe('useScans — refetchScans callback', () => {
  it('exposes refetchScans in return value', () => {
    const { result } = renderHook(() => useScans());
    expect(typeof result.current.refetchScans).toBe('function');
  });

  it('refetchScans calls fetchScans with the last-used tenantId', async () => {
    mockGetScans.mockResolvedValue({
      data: { content: [{ id: 's1', status: 'COMPLETED' }] },
    });

    const { result } = renderHook(() => useScans());

    // First fetch with tenantId
    await act(async () => {
      await result.current.fetchScans('tenant-xyz');
    });

    expect(mockGetScans).toHaveBeenCalledTimes(1);
    expect(result.current.scans).toHaveLength(1);

    // Now refetch without providing tenantId
    await act(async () => {
      await result.current.refetchScans();
    });

    // Should have called getScans again with the stored tenantId
    expect(mockGetScans).toHaveBeenCalledTimes(2);
    expect(mockGetScans).toHaveBeenLastCalledWith('tenant-xyz');
  });

  it('refetchScans does nothing if fetchScans was never called', async () => {
    const { result } = renderHook(() => useScans());

    await act(async () => {
      await result.current.refetchScans();
    });

    // No API call should have been made
    expect(mockGetScans).not.toHaveBeenCalled();
  });

  it('refetchScans uses the most recent tenantId after multiple calls', async () => {
    mockGetScans.mockResolvedValue({
      data: { content: [] },
    });

    const { result } = renderHook(() => useScans());

    await act(async () => {
      await result.current.fetchScans('first-tenant');
    });
    await act(async () => {
      await result.current.fetchScans('second-tenant');
    });

    mockGetScans.mockClear();

    await act(async () => {
      await result.current.refetchScans();
    });

    expect(mockGetScans).toHaveBeenCalledWith('second-tenant');
  });
});

describe('useScans — startScan', () => {
  it('startScan calls the API with mapped request', async () => {
    mockStartScan.mockResolvedValueOnce({
      data: { id: 'new-scan', status: 'RUNNING' },
    });

    const { result } = renderHook(() => useScans());

    const response = await act(async () => {
      return await result.current.startScan({
        projectId: 'proj-1',
        scanType: 'SAST',
        targetRepo: 'https://github.com/user/repo',
      });
    });

    expect(response).toEqual({ id: 'new-scan', status: 'RUNNING' });
    expect(mockStartScan).toHaveBeenCalledWith({
      type: 'SAST',
      targetUrl: undefined,
      targetRepo: 'https://github.com/user/repo',
      projectId: 'proj-1',
    });
  });
});

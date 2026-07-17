import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlans, useSubscription, usePaymentHistory, useUpgradePlan } from '@hooks/useBilling';
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
   usePlans()
   ──────────────────────────────────────────────── */
describe('usePlans', () => {
  it('returns loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it('maps API plans with correct price and feature transformation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 'PRO',
        name: 'Professional',
        priceCop: 120000,
        monthlyPriceUsd: 30,
        period: 'month',
        features: ['Proyectos ilimitados', 'Soporte prioritario'],
        maxTenants: -1,
        maxProjects: -1,
        maxUsers: -1,
        includesBlockchain: true,
        recommended: true,
      }],
    });

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    // When p.features is already an array, it's used as-is
    expect(result.current.data![0]).toEqual({
      id: 'PRO',
      name: 'Professional',
      price: 120000,
      period: 'month',
      features: ['Proyectos ilimitados', 'Soporte prioritario'],
      maxProjects: -1,
      maxScansPerMonth: -1,
    });
    expect(result.current.error).toBeNull();
    // Verify fetch was called with correct URL
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/billing/plans'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${mockToken}` }),
      }),
    );
  });

  it('builds features from limits when p.features is absent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 'ENTERPRISE',
        name: 'Enterprise',
        price: 400000,
        period: 'month',
        // NO features array — code should build from limits
        maxTenants: -1,
        maxProjects: -1,
        maxUsers: -1,
        includesBlockchain: true,
        recommended: true,
      }],
    });

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    const f = result.current.data![0].features;
    expect(f).toContain('Workspaces ilimitados');
    expect(f).toContain('Proyectos ilimitados');
    expect(f).toContain('Usuarios ilimitados');
    expect(f).toContain('Seguridad Blockchain');
    expect(f).toContain('⭐ Recomendado');
  });

  it('returns error on API failure instead of mock data', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    /* Should NOT return mock data — error state instead */
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(new Error('Network error'));
  });

  it('returns error on non-200 response instead of mock data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePlans(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(new Error('HTTP 500: undefined'));
  });
});

/* ────────────────────────────────────────────────
   useSubscription()
   ──────────────────────────────────────────────── */
describe('useSubscription', () => {
  it('returns subscription data on success', async () => {
    const mockSubscription = {
      id: 'sub-1',
      planId: 'PRO',
      planName: 'Professional',
      status: 'ACTIVE',
      currentPeriodStart: '2026-01-01',
      currentPeriodEnd: '2026-02-01',
      price: 120000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSubscription,
    });

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSubscription);
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/billing/subscriptions/me'),
      expect.any(Object),
    );
  });

  it('returns null when fetch fails (no mock fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSubscription(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Data is null (not undefined) because queryFn caught and returned null
    expect(result.current.data).toBeNull();
    // Error is NOT set because queryFn caught the error
    expect(result.current.error).toBeNull();
  });
});

/* ────────────────────────────────────────────────
   usePaymentHistory()
   ──────────────────────────────────────────────── */
describe('usePaymentHistory', () => {
  it('returns payment history array on success', async () => {
    const mockPayments = {
      content: [
        { id: 'pay-1', amount: 120000, status: 'PAID', description: 'PRO Plan', createdAt: '2026-01-01' },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPayments,
    });

    const { result } = renderHook(() => usePaymentHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toEqual({
      id: 'pay-1',
      amount: 120000,
      status: 'PAID',
      description: 'PRO Plan',
      createdAt: '2026-01-01',
    });
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/payments-history/me'),
      expect.any(Object),
    );
  });

  it('returns empty array on fetch failure (no mock fallback)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePaymentHistory(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

/* ────────────────────────────────────────────────
   useUpgradePlan()
   ──────────────────────────────────────────────── */
describe('useUpgradePlan', () => {
  it('mutates successfully and returns checkout data', async () => {
    const checkoutResponse = { initPoint: 'https://mp.com/checkout/123', preferenceId: 'pref_123' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => checkoutResponse,
    });

    const { result } = renderHook(() => useUpgradePlan(), { wrapper: createWrapper() });

    let response: any;
    await act(async () => {
      response = await result.current.upgradeToPlan('PRO');
    });

    expect(response).toEqual(checkoutResponse);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();

    // Verify correct POST to checkout endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subscriptions/checkout'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ planId: 'PRO' }),
      }),
    );
  });

  it('sets error when mutation fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Payment failed'));

    const { result } = renderHook(() => useUpgradePlan(), { wrapper: createWrapper() });

    // Fire and forget — the mutation will reject in the background
    result.current.upgradeToPlan('PRO').catch(() => {});

    await waitFor(() => {
      expect(result.current.error).toBe('Payment failed');
    });

    expect(result.current.isLoading).toBe(false);
  });
});

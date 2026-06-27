import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API, getAuthHeaders } from "../api/fetch-helpers";

export interface ScanRequest {
    projectId: string;
    scanType?: string;
    targetRepo?: string;
    targetUrl?: string;
}

export interface Scan {
    id: string;
    projectId: string;
    tenantId: string;
    userId: string;
    status: string;
    scanType: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

/* ======================================================
   QUERY KEYS
====================================================== */
export const scansKeys = {
    all: ["scans"] as const,
    list: (tenantId: string | null) => [...scansKeys.all, "list", tenantId] as const,
    detail: (scanId: string | null) => [...scansKeys.all, "detail", scanId] as const,
};

/* ======================================================
   FETCHER
====================================================== */
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
    const headers = { ...getAuthHeaders(), ...(options?.headers as Record<string, string>) };
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res.json();
}

/* ======================================================
   HOOKS
====================================================== */

/** Fetch paginated scans for a tenant */
export function useScans(tenantId: string | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: scansKeys.list(tenantId),
        queryFn: async () => {
            const response = await fetchJSON<any>(`${API}/api/bff/scans?page=0&size=50`);
            const rawData = response.content ?? response.data?.content ?? response.data ?? response;
            const normalized = (rawData || []).map((s: any) => ({
                ...s,
                id: s.id ?? s.scanId,
            }));
            return normalized as Scan[];
        },
        enabled: !!tenantId,
        staleTime: 15_000,
    });

    const startMutation = useMutation({
        mutationFn: (request: ScanRequest) => {
            const backendRequest = {
                type: request.scanType,
                targetUrl: request.targetUrl,
                targetRepo: request.targetRepo,
                projectId: request.projectId,
            };
            return fetchJSON<any>(`${API}/api/bff/scans/request`, {
                method: "POST",
                body: JSON.stringify(backendRequest),
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: scansKeys.all }),
    });

    const data = query.data ?? [];
    const scans = data;
    const error = (query.error as Error)?.message || null;

    return {
        data: query.data,
        scans,
        isLoading: query.isLoading,
        error,
        refetch: query.refetch,
        startScan: startMutation.mutateAsync,
    };
}

/** Fetch a single scan by ID */
export function useScan(scanId: string | null) {
    return useQuery({
        queryKey: scansKeys.detail(scanId),
        queryFn: () => fetchJSON<any>(`${API}/api/bff/scans/${scanId}`),
        enabled: !!scanId,
    });
}

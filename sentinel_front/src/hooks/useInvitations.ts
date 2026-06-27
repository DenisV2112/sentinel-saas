import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API, getAuthHeaders } from "../api/fetch-helpers";

export interface Invitation {
    id: string;
    email: string;
    role: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
    createdAt: string;
    expiresAt: string;
}

/* ======================================================
   QUERY KEYS
====================================================== */
export const invitationsKeys = {
    all: ["invitations"] as const,
    list: (tenantId: string | null) => [...invitationsKeys.all, "list", tenantId] as const,
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
   HOOK
====================================================== */
export function useInvitations(tenantId: string | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: invitationsKeys.list(tenantId),
        queryFn: () => fetchJSON<Invitation[]>(`${API}/api/tenants/${tenantId}/invitations`),
        enabled: !!tenantId,
        staleTime: 30_000,
    });

    const inviteMutation = useMutation({
        mutationFn: async ({ email, role, projectIds }: { email: string; role: string; projectIds?: string[] }) => {
            const body: any = { email, role };
            if (projectIds && projectIds.length > 0) {
                body.projectIds = projectIds;
            }
            const res = await fetch(`${API}/api/tenants/${tenantId}/invitations`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                const errorMessage = errJson.message || errJson.error || "Failed to send invitation";
                throw new Error(errorMessage);
            }

            return res.json();
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: invitationsKeys.all }),
    });

    const cancelMutation = useMutation({
        mutationFn: async (invitationId: string) => {
            const res = await fetch(`${API}/api/tenants/invitations/${invitationId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!res.ok) throw new Error("Failed to cancel invitation");
        },
        onMutate: async (invitationId: string) => {
            await queryClient.cancelQueries({ queryKey: invitationsKeys.list(tenantId) });
            const previous = queryClient.getQueryData<Invitation[]>(invitationsKeys.list(tenantId));
            queryClient.setQueryData<Invitation[]>(invitationsKeys.list(tenantId), (old) =>
                (old ?? []).filter((inv) => inv.id !== invitationId)
            );
            return { previous };
        },
        onError: (_err, _invitationId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(invitationsKeys.list(tenantId), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: invitationsKeys.list(tenantId) });
        },
    });

    const data = query.data ?? [];
    const invitations = data;
    const error = (query.error as Error)?.message || null;

    return {
        data: query.data,
        invitations,
        isLoading: query.isLoading,
        error,
        refetch: query.refetch,
        inviteMember: (email: string, role: string, projectIds?: string[]) =>
            inviteMutation.mutateAsync({ email, role, projectIds }),
        cancelInvitation: cancelMutation.mutateAsync,
    };
}

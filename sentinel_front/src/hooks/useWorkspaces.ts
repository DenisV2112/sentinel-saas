import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { API, fetchJSON, getAuthHeaders } from "../api/fetch-helpers";
import { dashboardKeys } from "./useDashboard";

/* ======================================================
   QUERY KEYS
====================================================== */
export const workspacesKeys = {
  all: ["workspaces"] as const,
  list: () => [...workspacesKeys.all, "list"] as const,
};

/* ======================================================
   WORKSPACE (TENANT) TYPES
====================================================== */

export interface Workspace {
  id: string;
  name: string;
  description: string;
  projectCount: number;
  memberCount: number;
  lastActivity: string;
  createdAt: string;
  plan: string;
}

/* ======================================================
   WORKSPACES HOOK
====================================================== */

export function useWorkspaces() {
  return useQuery({
    // Reuse dashboardKeys.summary() to share cache with useDashboardSummary
    queryKey: dashboardKeys.summary(),
    queryFn: async (): Promise<Workspace[]> => {
      const json = await fetchJSON<any>(`${API}/api/bff/dashboard`);

      // Transform tenants to workspaces format
      return (json.tenants ?? []).map((tenant: any) => ({
        id: tenant.id ?? tenant.tenantId,
        name: tenant.name ?? tenant.companyName ?? "Workspace",
        description:
          tenant.description ?? `${tenant.plan ?? "Free"} Plan`,
        projectCount:
          json.projects?.filter(
            (p: any) => p.tenantId === (tenant.id ?? tenant.tenantId),
          )?.length ?? 0,
        memberCount: tenant.memberCount ?? 1,
        lastActivity:
          tenant.updatedAt ?? tenant.createdAt ?? "Recently",
        createdAt: tenant.createdAt,
        plan: tenant.plan ?? "FREE",
      }));
    },
    staleTime: 30_000,
  });
}

/* ======================================================
   CREATE WORKSPACE (MUTATION)
====================================================== */

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
    }) => {
      setUpgradeRequired(false);

      const res = await fetch(`${API}/api/tenants`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          type: "PERSONAL",
        }),
      });

      // Handle 402 Payment Required (FREE plan limitation)
      if (res.status === 402) {
        setUpgradeRequired(true);
        const errorData = await res.json();
        throw new Error(
          errorData.message || "Upgrade required to create workspaces",
        );
      }

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to create workspace" }));
        throw new Error(
          errorData.message || "Failed to create workspace",
        );
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate the shared dashboard cache so useWorkspaces refetches
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.summary(),
      });
    },
  });

  return {
    createWorkspace: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
    upgradeRequired,
  };
}

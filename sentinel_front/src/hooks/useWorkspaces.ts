import { useEffect, useState } from "react";
import { API, getAuthHeaders } from "../api/fetch-helpers";

type ApiState<T> = {
    data: T;
    loading: boolean;
    error: string | null;
    refetch: () => void;
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

export function useWorkspaces(): ApiState<Workspace[]> {
    const [data, setData] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWorkspaces = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/bff/dashboard`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Failed to load workspaces");
            const json = await res.json();

            // Transform tenants to workspaces format
            const workspaces = (json.tenants ?? []).map((tenant: any) => ({
                id: tenant.id ?? tenant.tenantId,
                name: tenant.name ?? tenant.companyName ?? "Workspace",
                description: tenant.description ?? `${tenant.plan ?? "Free"} Plan`,
                projectCount: json.projects?.filter((p: any) => p.tenantId === tenant.id)?.length ?? 0,
                memberCount: tenant.memberCount ?? 1,
                lastActivity: tenant.updatedAt ?? tenant.createdAt ?? "Recently",
                createdAt: tenant.createdAt,
                plan: tenant.plan ?? "FREE",
            }));

            setData(workspaces);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    return { data, loading, error, refetch: fetchWorkspaces };
}

/* ======================================================
   CREATE WORKSPACE
====================================================== */

export function useCreateWorkspace() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [upgradeRequired, setUpgradeRequired] = useState(false);

    const createWorkspace = async (data: { name: string; description?: string }) => {
        try {
            setLoading(true);
            setError(null);
            setUpgradeRequired(false);
            const res = await fetch(`${API}/api/tenants`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    name: data.name,
                    type: "PERSONAL", // Defaulting to PERSONAL for simplified flow
                }),
            });

            // Handle 402 Payment Required (FREE plan)
            if (res.status === 402) {
                const errorData = await res.json();
                setUpgradeRequired(true);
                setError(errorData.message || "Upgrade required to create workspaces");
                throw new Error(errorData.message);
            }

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: "Failed to create workspace" }));
                throw new Error(errorData.message || "Failed to create workspace");
            }

            return await res.json();
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    return { createWorkspace, loading, error, upgradeRequired };
}

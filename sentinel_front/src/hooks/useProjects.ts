import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API, fetchJSON, getAuthHeaders } from "../api/fetch-helpers";

export interface Project {
    id: string;
    name: string;
    description: string;
    tenantId: string;
    domainCount: number;
    repoCount: number;
    createdAt: string;
}

/* ======================================================
   QUERY KEYS
====================================================== */
export const projectsKeys = {
    all: ["projects"] as const,
    list: (tenantId: string | null) => [...projectsKeys.all, "list", tenantId] as const,
};

/* ======================================================
   HOOK
====================================================== */
export function useProjects(tenantId: string | null) {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: projectsKeys.list(tenantId),
        queryFn: () => fetchJSON<Project[]>(`${API}/api/projects?tenantId=${tenantId}`),
        enabled: !!tenantId,
        staleTime: 30_000,
    });

    const createMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) =>
            fetchJSON<Project>(`${API}/api/projects`, {
                method: "POST",
                body: JSON.stringify(data),
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ projectId, data }: { projectId: string; data: { name: string; description?: string } }) =>
            fetchJSON<Project>(`${API}/api/projects/${projectId}`, {
                method: "PUT",
                body: JSON.stringify(data),
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
    });

    const deleteMutation = useMutation({
        mutationFn: (projectId: string) =>
            fetch(`${API}/api/projects/${projectId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            }).then(res => {
                if (!res.ok) throw new Error("Failed to delete project");
            }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
    });

    const data = query.data ?? [];
    const projects = data;
    const projectsMap = new Map(projects.map((p: Project) => [p.id, p] as [string, Project]));
    const error = (query.error as Error)?.message || null;

    return {
        data: query.data,
        projects,
        projectsMap,
        isLoading: query.isLoading,
        error,
        refetch: query.refetch,
        createProject: createMutation.mutateAsync,
        updateProject: (projectId: string, data: { name: string; description?: string }) =>
            updateMutation.mutateAsync({ projectId, data }),
        deleteProject: deleteMutation.mutateAsync,
    };
}

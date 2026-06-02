import { useState, useEffect } from "react";
import { API, getAuthHeaders } from "../api/fetch-helpers";

export interface Project {
    id: string;
    name: string;
    description: string;
    tenantId: string;
    domainCount: number;
    repoCount: number;
    createdAt: string;
}

export function useProjects(tenantId: string | null) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = async () => {
        if (!tenantId) return;
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/projects?tenantId=${tenantId}`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Failed to load projects");
            const json = await res.json();
            setProjects(json);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenantId) {
            fetchProjects();
        } else {
            setProjects([]);
        }
    }, [tenantId]);

    const createProject = async (data: { name: string; description?: string }) => {
        if (!tenantId) throw new Error("No tenant selected");
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/projects`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create project");
            const newProject = await res.json();
            setProjects([...projects, newProject]);
            return newProject;
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const updateProject = async (projectId: string, data: { name: string; description?: string }) => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/projects/${projectId}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update project");
            const updatedProject = await res.json();
            setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
            return updatedProject;
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/projects/${projectId}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Failed to delete project");
            setProjects(projects.filter(p => p.id !== projectId));
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setLoading(false);
        }
    };

    const projectsMap = new Map(projects.map(p => [p.id, p] as [string, Project]));

    return { projects, projectsMap, loading, error, createProject, updateProject, deleteProject, refetch: fetchProjects };
}

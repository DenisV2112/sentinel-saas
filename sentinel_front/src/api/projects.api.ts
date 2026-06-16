import api from "./axios";

export const getProjects = (tenantId: string) => {
  return api.get("/api/projects", { params: { tenantId } });
};

export const getProjectById = (id: string) => {
  return api.get(`/api/projects/${id}`);
};

export const createProject = (data: any) => {
  return api.post("/api/projects", data);
};

export const updateProject = (id: string, data: any) => {
  return api.put(`/api/projects/${id}`, data);
};

export const deleteProject = (id: string) => {
  return api.delete(`/api/projects/${id}`);
};

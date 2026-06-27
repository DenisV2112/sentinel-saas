
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    "Content-Type": "application/json",
  },
});

const publicEndpoints = ["/api/auth/login", "/api/auth/register"];

api.interceptors.request.use((config) => {
  const isPublic = publicEndpoints.some((endpoint) =>
    config.url?.startsWith(endpoint)
  );

  if (isPublic) {
    return config;
  }

  const token = localStorage.getItem("accessToken");
  const tenantId = localStorage.getItem("tenantId");
  const userId = localStorage.getItem("userId");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers["X-Tenant-Id"] = tenantId;
  }

  if (userId) {
    config.headers["X-User-Id"] = userId;
  }

  return config;
});

export default api;
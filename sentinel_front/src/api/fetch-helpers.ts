const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };

  const token = localStorage.getItem("accessToken");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const userId = localStorage.getItem("userId");
  if (userId) headers["X-User-Id"] = userId;

  const tenantId = localStorage.getItem("tenantId");
  if (tenantId) headers["X-Tenant-Id"] = tenantId;

  return headers;
}

export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = { ...getAuthHeaders(), ...(options?.headers as Record<string, string>) };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export { API };

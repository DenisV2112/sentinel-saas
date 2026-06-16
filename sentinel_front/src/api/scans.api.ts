import api from './axios';

export const getScans = (tenantId?: string) => {
  const headers: Record<string, string> = {};
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  return api.get('/api/bff/scans', {
    params: { page: 0, size: 50 },
    headers,
  });
};

export const startScan = (data: {
  type?: string;
  targetUrl?: string;
  targetRepo?: string;
  projectId: string;
}) =>
  api.post('/api/bff/scans/request', data);

export const getScan = (scanId: string) =>
  api.get(`/api/bff/scans/${scanId}`);

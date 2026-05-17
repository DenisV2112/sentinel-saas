import api from './axios';

export const getScans = (tenantId: string) =>
  api.get('/api/scans', {
    params: { page: 0, size: 50 },
    headers: { 'X-Tenant-Id': tenantId },
  });

export const startScan = (data: {
  type?: string;
  targetUrl?: string;
  targetRepo?: string;
  projectId: string;
}, tenantId: string, userId: string) =>
  api.post('/api/scans', data, {
    headers: {
      'X-Tenant-Id': tenantId,
      'X-User-Id': userId,
    },
  });

export const getScan = (scanId: string) =>
  api.get(`/api/scans/${scanId}`);

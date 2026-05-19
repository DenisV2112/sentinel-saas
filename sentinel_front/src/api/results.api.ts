import api from './axios';

export const getScanResults = (scanId: string) =>
  api.get(`/api/bff/scans/${scanId}/results`);

export const getVulnerabilityAnalytics = (days: number = 30) =>
  api.get('/api/bff/analytics/vulnerabilities', {
    params: { days },
  });

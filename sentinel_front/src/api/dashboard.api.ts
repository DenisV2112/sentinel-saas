import api from './axios';

export const getDashboard = () =>
  api.get('/api/bff/dashboard');

export const getActiveScans = () =>
  api.get('/api/bff/scans', { params: { status: 'RUNNING' } });

export const getVulnerabilityTrends = (days: number) =>
  api.get('/api/bff/analytics/vulnerabilities', { params: { days } });

export const getRecentScans = (limit: number) =>
  api.get('/api/bff/scans', {
    params: { size: limit, sort: 'createdAt,desc' },
  });

export const getTopRiskProjects = () =>
  api.get('/api/dashboard/top-risk-projects');

export const getDashboardNotifications = () =>
  api.get('/api/bff/notifications', { params: { type: 'dashboard' } });

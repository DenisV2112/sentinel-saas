import api from './axios';

export const getDashboard = () =>
  api.get('/api/bff/dashboard');

export const createTenant = (data: { name: string }) =>
  api.post('/api/tenants', {
    name: data.name,
    type: 'PERSONAL',
  });

import api from './axios';

export const login = (data: { email: string; password: string }) =>
  api.post('/api/auth/login', data);

export const register = (data: {
  username: string;
  email: string;
  password: string;
  role: string;
}) => api.post('/api/auth/register', data);

export const getGoogleOAuthUrl = () =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/oauth2/authorization/google`;

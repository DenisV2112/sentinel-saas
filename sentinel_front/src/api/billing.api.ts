import api from './axios';

export const getPlans = () =>
  api.get('/api/billing/plans');

export const getMySubscription = () =>
  api.get('/api/billing/subscriptions/me');

export const getPaymentHistory = () =>
  api.get('/api/payments-history/me');

export const createCheckout = (planId: string) =>
  api.post('/api/subscriptions/checkout', { planId });

export const testWebhook = (paymentId: string, planId: string, userId: string) =>
  api.post(`/api/subscriptions/webhook/test?paymentId=${paymentId}&planId=${planId}&userId=${userId}`);

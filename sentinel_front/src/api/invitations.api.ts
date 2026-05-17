import api from './axios';

export const getInvitations = (tenantId: string) =>
  api.get(`/api/tenants/${tenantId}/invitations`);

export const inviteMember = (
  tenantId: string,
  data: { email: string; role: string; projectIds?: string[] }
) => api.post(`/api/tenants/${tenantId}/invitations`, data);

export const cancelInvitation = (invitationId: string) =>
  api.delete(`/api/tenants/invitations/${invitationId}`);

// Plan limits configuration (matches backend UserLimitsService)
export const PLAN_LIMITS: Record<string, { maxTenants: number; maxProjects: number }> = {
    FREE: { maxTenants: 0, maxProjects: 0 },
    PRO: { maxTenants: 3, maxProjects: 6 },
    PROFESSIONAL: { maxTenants: 3, maxProjects: 6 },
    ENTERPRISE: { maxTenants: 6, maxProjects: 12 },
};

import { useQuery, useMutation } from "@tanstack/react-query";
import { API, fetchJSON, getAuthHeaders } from "../api/fetch-helpers";

/* ======================================================
   QUERY KEYS
====================================================== */
export const billingKeys = {
  all: ["billing"] as const,
  plans: () => [...billingKeys.all, "plans"] as const,
  subscription: () => [...billingKeys.all, "subscription"] as const,
  paymentHistory: () => [...billingKeys.all, "paymentHistory"] as const,
};

/* ======================================================
   BILLING TYPES
====================================================== */

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  maxProjects: number;
  maxScansPerMonth: number;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  price: number;
}

export interface Payment {
  id: string;
  amount: number;
  status: "PAID" | "PENDING" | "FAILED";
  description: string;
  createdAt: string;
}

/* ======================================================
   TRANSFORMERS
====================================================== */

function transformRawPlan(p: any): Plan {
  return {
    id: p.id,
    name: p.name,
    price:
      p.priceCop ??
      p.monthlyPriceCop ??
      p.price ??
      p.monthlyPriceUsd ??
      0,
    period: p.period ?? "month",
    features: p.features ?? [
      p.maxTenants === 0
        ? "Sin workspaces"
        : p.maxTenants === -1
          ? "Workspaces ilimitados"
          : `${p.maxTenants} Workspaces`,
      p.maxProjects === -1
        ? "Proyectos ilimitados"
        : `${p.maxProjects} Proyectos`,
      p.maxUsers === -1
        ? "Usuarios ilimitados"
        : `${p.maxUsers} Usuarios por workspace`,
      p.includesBlockchain ? "Seguridad Blockchain" : null,
      p.recommended ? "⭐ Recomendado" : null,
    ].filter(Boolean) as string[],
    maxProjects: p.maxProjects,
    maxScansPerMonth: -1,
  };
}

/* ======================================================
   PLANS HOOK
====================================================== */

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: async (): Promise<Plan[]> => {
      const json = await fetchJSON<any>(`${API}/api/billing/plans`);
      const rawData = Array.isArray(json) ? json : json?.content ?? [];
      return rawData.map(transformRawPlan);
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ======================================================
   SUBSCRIPTION HOOK
====================================================== */

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: async (): Promise<Subscription | null> => {
      try {
        return await fetchJSON<Subscription>(
          `${API}/api/billing/subscriptions/me`,
        );
      } catch {
        return null;
      }
    },
    staleTime: 30_000,
  });
}

/* ======================================================
   PAYMENT HISTORY HOOK
====================================================== */

export function usePaymentHistory() {
  return useQuery({
    queryKey: billingKeys.paymentHistory(),
    queryFn: async (): Promise<Payment[]> => {
      try {
        const json = await fetchJSON<any>(
          `${API}/api/payments-history/me`,
        );
        return Array.isArray(json) ? json : json?.content ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
}

/* ======================================================
   UPGRADE PLAN HOOK (MUTATION)
====================================================== */

export function useUpgradePlan() {
  const mutation = useMutation({
    mutationFn: async (
      planId: string,
    ): Promise<{ initPoint?: string; preferenceId?: string }> => {
      const res = await fetch(`${API}/api/subscriptions/checkout`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  return {
    upgradeToPlan: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}

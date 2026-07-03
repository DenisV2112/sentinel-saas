import React, { useState } from "react";
import Sidebar from "@/components/commons/Sidebar";
import { useTheme } from "@/utils/store/themeContext";
import {
    CreditCard,
    CheckCircle,
    Clock,
    Loader2,
    X
} from "lucide-react";
import { usePlans, useSubscription, usePaymentHistory, useUpgradePlan } from "@hooks/useBilling";
import { motion } from "framer-motion";
import { CardSkeleton } from "@/components/commons/skeletons/CardSkeleton";
import { TableSkeleton } from "@/components/commons/skeletons/TableSkeleton";
// MercadoPago SDK not needed - we use redirect-based Checkout Pro
// import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
// initMercadoPago('...', { locale: 'es-AR' });

export default function BillingPage() {
    const { theme } = useTheme();
    const { data: plans, isLoading: plansLoading } = usePlans();
    const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useSubscription();
    const { data: payments, isLoading: paymentsLoading } = usePaymentHistory();
    const { upgradeToPlan, isLoading: upgradeLoading } = useUpgradePlan();

    const [preferenceId, setPreferenceId] = useState<string | null>(null);
    const [initPoint, setInitPoint] = useState<string | null>(null);

    // Get user from session or local storage for fallback
    const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
    const displayPlan = subscription?.planName || user?.plan || "Free";
    const formatPlan = (p: string) => p === "PRO" ? "Professional" : p;

    const loading = plansLoading || subLoading || paymentsLoading;

    const handleUpgrade = async (planId: string) => {
        const result = await upgradeToPlan(planId);
        if (result && result.initPoint) {
            // Redirect directly to MercadoPago checkout page
            // This bypasses the need for Wallet component and public_key
            window.location.href = result.initPoint;
        }
    };

    const closeModal = () => {
        setPreferenceId(null);
        setInitPoint(null);
        refetchSubscription();
    };

    // Determine if this is a Mock checkout
    const isMock = preferenceId?.startsWith("MOCK_");

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="app" style={{ background: 'var(--color-background)' }}>
            <Sidebar />

            <main className="main">
                <header
                    className="header"
                    style={{
                        background: 'var(--color-surface)',
                        borderBottom: '1px solid var(--color-border)',
                    }}
                >
                    <h1 style={{ color: 'var(--color-text-primary)' }}>Billing & Plans</h1>
                </header>

                <section className="content" style={{ padding: 24, position: 'relative' }}>
                    {/* Loading State */}
                    {loading && (
                        <>
                            <CardSkeleton count={1} />
                            <div style={{ marginTop: 24 }}>
                                <CardSkeleton count={3} />
                            </div>
                            <div style={{ marginTop: 24 }}>
                                <TableSkeleton columns={4} rows={4} />
                            </div>
                        </>
                    )}

                    {!loading && (
                        <>
                            {/* Current Plan */}
                            <div
                                style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 12,
                                    padding: 24,
                                    marginBottom: 24,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                    <CreditCard size={24} color="var(--color-primary)" />
                                    <h2 style={{ color: 'var(--color-text-primary)', margin: 0 }}>Current Plan</h2>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <span
                                        style={{
                                            background: 'var(--color-primary)',
                                            color: 'var(--color-on-primary)',
                                            padding: "8px 16px",
                                            borderRadius: 8,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {formatPlan(displayPlan)}
                                    </span>
                                    <span className="text-secondary">
                                        {subscription?.currentPeriodEnd
                                            ? `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                                            : "Active via User Plan"}
                                    </span>
                                </div>
                            </div>

                            {/* Sandbox Mode Banner Removed */}

                            {/* Plans Grid */}
                            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 16 }}>Planes Disponibles</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
                                {(plans || []).sort((a, b) => {
                                    // Sort: FREE first, then PRO, then ENTERPRISE
                                    const order: Record<string, number> = { 'FREE': 0, 'PRO': 1, 'PROFESSIONAL': 1, 'ENTERPRISE': 2 };
                                    return (order[a.id.toUpperCase()] ?? 99) - (order[b.id.toUpperCase()] ?? 99);
                                }).map((plan) => {
                                    // Plan hierarchy: FREE < PRO/PROFESSIONAL < ENTERPRISE
                                    const planOrder: Record<string, number> = {
                                        'FREE': 0, 'PRO': 1, 'PROFESSIONAL': 1, 'ENTERPRISE': 2,
                                        // Legacy plans (lowercase)
                                        'free': 0, 'pro': 1, 'professional': 1, 'enterprise': 2,
                                    };

                                    const currentPlanId = subscription?.planId?.toUpperCase() || user?.plan?.toUpperCase() || 'FREE';
                                    const thisPlanId = plan.id.toUpperCase();

                                    const currentPlanOrder = planOrder[currentPlanId] ?? 0;
                                    const thisPlanOrder = planOrder[thisPlanId] ?? 0;

                                    const isCurrent = currentPlanId === thisPlanId;
                                    const isDowngrade = thisPlanOrder < currentPlanOrder;
                                    const isUpgrade = thisPlanOrder > currentPlanOrder;

                                    return (
                                        <div
                                            key={plan.id}
                                            style={{
                                                background: 'var(--color-surface)',
                                                border: isCurrent
                                                    ? '2px solid var(--color-primary)'
                                                    : '1px solid var(--color-border)',
                                                borderRadius: 12,
                                                padding: 24,
                                                position: "relative",
                                                opacity: isDowngrade ? 0.6 : 1,
                                            }}
                                        >
                                            {isCurrent && (
                                                <span
                                                    style={{
                                                        position: "absolute",
                                                        top: -12,
                                                        right: 16,
                                                        background: 'var(--color-primary)',
                                                        color: 'var(--color-on-primary)',
                                                        padding: "4px 12px",
                                                        borderRadius: 12,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Current Plan
                                                </span>
                                            )}

                                            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 8 }}>{plan.name}</h3>
                                            <div style={{ marginBottom: 16 }}>
                                                <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                    {plan.price === 0 ? 'Gratis' : `$${plan.price.toLocaleString('es-CO')}`}
                                                </span>
                                                <span className="text-secondary">
                                                    {plan.price > 0 ? ' COP/mes' : ''}
                                                </span>
                                            </div>

                                            <ul style={{ listStyle: "none", padding: 0, marginBottom: 24 }}>
                                                {(plan.features || []).map((feature, idx) => (
                                                    <li
                                                        key={idx}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            marginBottom: 8,
                                                        }}
                                                        className="text-secondary"
                                                    >
                                                        <CheckCircle size={16} color="var(--color-success)" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>

                                            <button
                                                onClick={() => isUpgrade && handleUpgrade(plan.id)}
                                                style={{
                                                    width: "100%",
                                                    padding: "12px 24px",
                                                    borderRadius: 8,
                                                    border: isCurrent || isDowngrade ? "none" : "1px solid var(--color-primary)",
                                                    background: isUpgrade ? 'var(--color-primary)' : 'var(--color-surface)',
                                                    color: isUpgrade ? 'var(--color-on-primary)' : 'var(--color-text-tertiary)',
                                                    fontWeight: 600,
                                                    cursor: isUpgrade && !upgradeLoading ? "pointer" : "not-allowed",
                                                    opacity: upgradeLoading ? 0.7 : 1,
                                                }}
                                                disabled={!isUpgrade || upgradeLoading}
                                            >
                                                {upgradeLoading ? "Processing..." :
                                                    isCurrent ? "✓ Current Plan" :
                                                        isDowngrade ? "—" :
                                                            "Upgrade"}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Payment History */}
                            <div
                                style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 12,
                                    padding: 24,
                                    marginTop: 24,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                    <Clock size={20} color="var(--color-primary)" />
                                    <h3 style={{ color: 'var(--color-text-primary)', margin: 0 }}>Payment History</h3>
                                </div>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            {["Date", "Description", "Amount", "Status"].map((h) => (
                                                <th
                                                    key={h}
                                                    style={{
                                                        textAlign: "left",
                                                        padding: "12px 8px",
                                                        borderBottom: '1px solid var(--color-border)',
                                                        fontWeight: 500,
                                                    }}
                                                    className="text-secondary"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(payments || []).map((payment) => (
                                            <tr key={payment.id}>
                                                <td style={{ padding: "12px 8px", color: 'var(--color-text-primary)' }}>
                                                    {new Date(payment.createdAt).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: "12px 8px" }} className="text-secondary">
                                                    {payment.description}
                                                </td>
                                                <td style={{ padding: "12px 8px", color: 'var(--color-text-primary)' }}>
                                                    ${payment.amount.toLocaleString('es-CO')} COP
                                                </td>
                                                <td style={{ padding: "12px 8px" }}>
                                                    <span
                                                        style={{
                                                            background:
                                                                payment.status === "PAID"
                                                                    ? 'var(--color-success)'
                                                                    : payment.status === "PENDING"
                                                                        ? 'var(--color-warning)'
                                                                        : 'var(--color-danger)',
                                                            color: 'var(--color-on-primary)',
                                                            padding: "4px 8px",
                                                            borderRadius: 4,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        {payment.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {payments.length === 0 && (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: "center", padding: 20 }} className="text-tertiary">
                                                    No payments yet
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Dual Strategy Modal */}
                    {preferenceId && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                            justifyContent: 'center', alignItems: 'center', zIndex: 1000
                        }}>
                            <div style={{
                                backgroundColor: 'var(--color-surface)', padding: '24px',
                                borderRadius: '12px', width: '100%', maxWidth: '500px',
                                position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                            }}>
                                <button
                                    onClick={closeModal}
                                    style={{
                                        position: 'absolute', top: 12, right: 12,
                                        background: 'transparent', border: 'none',
                                        cursor: 'pointer',
                                    }}
                                    className="text-secondary"
                                >
                                    <X size={24} />
                                </button>

                                <h2 style={{ lineHeight: '1.5', marginBottom: '16px', color: 'var(--color-text-primary)' }}>
                                    {isMock ? "Confirm Subscription (Test Mode)" : "Complete Subscription"}
                                </h2>

                                <div id="wallet_container">
                                    {isMock ? (
                                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                            <p style={{ marginBottom: 20 }} className="text-secondary">
                                                You are in Development Mode. <br />
                                                Click below to simulate a successful payment.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    if (initPoint) window.location.href = initPoint;
                                                }}
                                                style={{
                                                    background: 'var(--color-success)',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '12px 24px',
                                                    borderRadius: '8px',
                                                    fontWeight: 'bold',
                                                    fontSize: '16px',
                                                    cursor: 'pointer',
                                                    width: '100%'
                                                }}
                                            >
                                                Simulate Payment
                                            </button>
                                        </div>
                                    ) : (
                                        // Redirect button instead of Wallet component
                                        <button
                                            onClick={() => {
                                                if (initPoint) window.location.href = initPoint;
                                            }}
                                            style={{
                                                background: 'var(--color-primary)',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '12px 24px',
                                                borderRadius: '8px',
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                width: '100%'
                                            }}
                                        >
                                            Continue to MercadoPago Checkout
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            </main>
        </div>
        </motion.div>
    );
}

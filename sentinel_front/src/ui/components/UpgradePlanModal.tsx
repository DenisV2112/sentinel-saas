import React from 'react';
import { CreditCard, X } from 'lucide-react';

interface UpgradePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

export default function UpgradePlanModal({ isOpen, onClose, message }: UpgradePlanModalProps) {
    if (!isOpen) return null;

    const handleUpgrade = () => {
        // Redirect to billing/plans page
        window.location.href = '/billing';
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--color-surface)',
                    padding: '32px',
                    borderRadius: '16px',
                    width: '90%',
                    maxWidth: '500px',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <CreditCard size={24} color="var(--color-on-primary)" />
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '24px' }}>
                                Upgrade Required
                            </h2>
                            <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0 0', fontSize: '14px' }}>
                                Unlock this feature
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--color-text-tertiary)',
                            padding: '8px',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Message */}
                <div
                    style={{
                        padding: '20px',
                        background: 'var(--color-background)',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        borderLeft: '4px solid var(--color-warning)',
                    }}
                >
                    <p style={{ color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.6' }}>
                        {message || 'Free plan users cannot create workspaces. Please upgrade to BASIC, PRO or ENTERPRISE plan to create your own workspace.'}
                    </p>
                </div>

                {/* Alternative */}
                <div
                    style={{
                        padding: '16px',
                        background: 'var(--color-background)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                    }}
                >
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
                        💡 <strong>Tip:</strong> You can still accept invitations to other workspaces while on the FREE plan.
                    </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px 24px',
                            background: 'transparent',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--color-background)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Maybe Later
                    </button>
                    <button
                        onClick={handleUpgrade}
                        style={{
                            flex: 2,
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            color: 'var(--color-on-primary)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                        }}
                    >
                        View Plans & Upgrade
                    </button>
                </div>
            </div>
        </div>
    );
}

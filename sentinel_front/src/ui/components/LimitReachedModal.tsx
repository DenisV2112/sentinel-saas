import React from 'react';
import { AlertTriangle, CreditCard, X } from 'lucide-react';

interface LimitReachedModalProps {
    isOpen: boolean;
    onClose: () => void;
    resourceType: 'workspaces' | 'projects' | 'members';
    currentCount: number;
    maxLimit: number;
    currentPlan: string; // 'FREE' | 'PRO' | 'ENTERPRISE'
}

export default function LimitReachedModal({
    isOpen,
    onClose,
    resourceType,
    currentCount,
    maxLimit,
    currentPlan
}: LimitReachedModalProps) {
    if (!isOpen) return null;

    const isEnterprise = currentPlan.toUpperCase() === 'ENTERPRISE';
    const canUpgrade = !isEnterprise;

    const resourceNames: Record<string, string> = {
        workspaces: 'Workspaces',
        projects: 'Proyectos',
        members: 'Miembros'
    };

    const resourceName = resourceNames[resourceType] || resourceType;

    const handleUpgrade = () => {
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
                                background: isEnterprise
                                    ? 'linear-gradient(135deg, var(--color-warning), var(--color-warning))'
                                    : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            {isEnterprise ? <AlertTriangle size={24} color="var(--color-on-primary)" /> : <CreditCard size={24} color="var(--color-on-primary)" />}
                        </div>
                        <div>
                            <h2 style={{ color: 'var(--color-text-primary)', margin: 0, fontSize: '24px' }}>
                                {isEnterprise ? 'Límite Alcanzado' : 'Actualiza tu Plan'}
                            </h2>
                            <p style={{ color: 'var(--color-text-secondary)', margin: '4px 0 0 0', fontSize: '14px' }}>
                                Máximo de {resourceName.toLowerCase()} alcanzado
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

                {/* Usage Display */}
                <div
                    style={{
                        padding: '20px',
                        background: 'var(--color-background)',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        borderLeft: `4px solid ${isEnterprise ? 'var(--color-warning)' : 'var(--color-primary)'}`,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Uso actual</span>
                        <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '18px' }}>
                            {currentCount} / {maxLimit}
                        </span>
                    </div>
                    <div style={{
                        height: '8px',
                        background: 'var(--color-border)',
                        borderRadius: '4px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: '100%',
                            background: isEnterprise
                                ? 'linear-gradient(90deg, var(--color-warning), var(--color-warning))'
                                : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-dark))',
                            borderRadius: '4px',
                        }} />
                    </div>
                </div>

                {/* Message */}
                <div
                    style={{
                        padding: '16px',
                        background: 'var(--color-background)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                    }}
                >
                    {isEnterprise ? (
                        <p style={{ color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.6' }}>
                            Has alcanzado el límite máximo de <strong>{resourceName.toLowerCase()}</strong> para tu plan Enterprise.
                            <br /><br />
                            Para obtener más capacidad, contacta a nuestro equipo de ventas para una solución personalizada.
                        </p>
                    ) : (
                        <p style={{ color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.6' }}>
                            Has alcanzado el límite de <strong>{resourceName.toLowerCase()}</strong> para tu plan actual.
                            <br /><br />
                            Actualiza a <strong>Enterprise</strong> para obtener mayor capacidad y características premium.
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: canUpgrade ? 1 : 2,
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
                        {isEnterprise ? 'Entendido' : 'Más Tarde'}
                    </button>
                    {canUpgrade && (
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
                            Ver Planes & Actualizar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

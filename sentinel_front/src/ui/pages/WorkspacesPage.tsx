import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/commons/Sidebar";
import {
    Folder,
    Plus,
    Settings,
    ChevronRight,
    Users,
    FileCode,
    Loader2,
} from "lucide-react";
import { useWorkspaces, useCreateWorkspace } from "@hooks/useWorkspaces";
import { useSubscription } from "@hooks/useBilling";
import { ProjectsList } from "@/ui/components/ProjectsList";
import UpgradePlanModal from "@/ui/components/UpgradePlanModal";
import LimitReachedModal from "@/ui/components/LimitReachedModal";
import { motion } from "framer-motion";
import { CardSkeleton } from "@/components/commons/skeletons/CardSkeleton";
import { PLAN_LIMITS } from "@/constants/planLimits";

export default function WorkspacesPage() {
    const navigate = useNavigate();
    const { data: workspaces, isLoading, error, refetch } = useWorkspaces();
    const { data: subscription } = useSubscription(); // Check subscription
    const { createWorkspace, isLoading: creating, upgradeRequired } = useCreateWorkspace();
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);

    // Retrieve user from session or local storage for fallback plan check
    const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
    const currentPlan = (subscription?.planId || user?.plan || "FREE").toUpperCase();
    const planLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.FREE;
    const currentWorkspaceCount = workspaces?.length || 0;
    const isAtLimit = currentWorkspaceCount >= planLimits.maxTenants && planLimits.maxTenants !== -1;

    // Helper to check if creation is allowed: Check Subscription OR User Session
    const canCreateWorkspace = ((subscription?.planId && subscription.planId !== "FREE" && subscription?.planId !== "free")
        || (user?.plan === "PRO" || user?.plan === "ENTERPRISE" || user?.plan === "PROFESSIONAL"))
        && !isAtLimit;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createWorkspace({ name: newName, description: newDesc });
            setIsCreateModalOpen(false);
            setNewName("");
            setNewDesc("");
            refetch(); // Refresh list
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Failed to create workspace";
            setCreateError(errorMsg);
            // Check if it's an upgrade required error (402)
            if (upgradeRequired) {
                setShowUpgradeModal(true);
                setIsCreateModalOpen(false);
            }
        }
    };

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
                    <h1 style={{ color: 'var(--color-text-primary)' }}>Workspaces</h1>
                    <button
                        onClick={() => {
                            if (canCreateWorkspace) {
                                setIsCreateModalOpen(true);
                            } else if (isAtLimit && currentPlan !== 'FREE') {
                                // User has a paid plan but reached limit
                                setShowLimitModal(true);
                            } else {
                                // User is on FREE plan
                                setShowUpgradeModal(true);
                            }
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 20px",
                            background: canCreateWorkspace ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: canCreateWorkspace ? 'var(--color-on-primary)' : 'var(--color-text-tertiary)',
                            border: canCreateWorkspace ? "none" : '1px solid var(--color-border)',
                            borderRadius: 8,
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: canCreateWorkspace ? 1 : 0.7,
                        }}
                    >
                        {canCreateWorkspace ? (
                            <>
                                <Plus size={18} />
                                New Workspace
                            </>
                        ) : isAtLimit ? (
                            <>
                                <Plus size={18} />
                                Limit Reached ({currentWorkspaceCount}/{planLimits.maxTenants})
                            </>
                        ) : (
                            <>
                                <Plus size={18} />
                                Upgrade to Create
                            </>
                        )}
                    </button>
                </header>

                <section className="content" style={{ padding: 24 }}>
                    {/* Loading State */}
                    {isLoading && (
                        <CardSkeleton count={3} />
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{ color: 'var(--color-danger)', padding: 20, textAlign: "center" }}>
                            Error loading workspaces: {error}
                            <button onClick={refetch} style={{ marginLeft: 10, color: 'var(--color-primary)' }}>
                                Retry
                            </button>
                        </div>
                    )}

                    {/* Workspaces Grid */}
                    {!isLoading && !error && (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                                gap: 20,
                            }}
                        >
                            {workspaces.map((workspace) => (
                                <div
                                    key={workspace.id}
                                    onClick={() => navigate(`/workspaces/${workspace.id}`)}
                                    style={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 12,
                                        padding: 20,
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {/* Header */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: 12,
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 8,
                                                    background: 'var(--color-primary)',
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                <Folder size={20} color={'var(--color-on-primary)'} />
                                            </div>
                                            <div>
                                                <h3 style={{ color: 'var(--color-text-primary)', margin: 0 }}>
                                                    {workspace.name}
                                                </h3>
                                                <p
                                                    style={{
                                                        color: 'var(--color-text-secondary)',
                                                        fontSize: 13,
                                                        margin: 0,
                                                    }}
                                                >
                                                    {workspace.description}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            aria-label={`Settings for ${workspace.name}`}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                cursor: "pointer",
                                                color: 'var(--color-text-tertiary)',
                                            }}
                                        >
                                            <Settings size={18} />
                                        </button>
                                    </div>

                                    {/* Stats */}
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 16,
                                            marginBottom: 16,
                                            paddingTop: 12,
                                            borderTop: '1px solid var(--color-border)',
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <FileCode size={16} color={'var(--color-text-tertiary)'} />
                                            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                                                {workspace.projectCount} Projects
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <Users size={16} color={'var(--color-text-tertiary)'} />
                                            <span style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                                                {workspace.memberCount} Members
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>
                                            Last activity: {workspace.lastActivity}
                                        </span>
                                        <ChevronRight size={18} color={'var(--color-text-tertiary)'} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && !error && workspaces.length === 0 && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: 60,
                                background: 'var(--color-surface)',
                                borderRadius: 12,
                                border: '1px dashed var(--color-border)',
                            }}
                        >
                            <Folder size={48} color={'var(--color-text-tertiary)'} />
                            <h3 style={{ color: 'var(--color-text-primary)', marginTop: 16 }}>
                                No Workspaces Yet
                            </h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
                                Create your first workspace to organize your projects
                            </p>
                            <button
                                onClick={() => {
                                    if (canCreateWorkspace) {
                                        setIsCreateModalOpen(true);
                                    } else {
                                        setShowUpgradeModal(true);
                                    }
                                }}
                                style={{
                                    padding: "12px 24px",
                                    background: 'var(--color-primary)',
                                    color: 'var(--color-on-primary)',
                                    border: "none",
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    opacity: canCreateWorkspace ? 1 : 0.8,
                                }}
                            >
                                {canCreateWorkspace ? "Create Workspace" : "Upgrade to Create"}
                            </button>
                        </div>
                    )}

                    {/* Projects Section */}
                    {selectedWorkspace && (
                        <div style={{ marginTop: 40, borderTop: '1px solid var(--color-border)', paddingTop: 24 }}>
                            <ProjectsList workspaceId={selectedWorkspace} />
                        </div>
                    )}
                </section>

                {/* Create Modal */}
                {isCreateModalOpen && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000,
                        }}
                    >
                        <form
                            onSubmit={handleCreate}
                            style={{
                                background: 'var(--color-surface)',
                                padding: 24,
                                borderRadius: 12,
                                width: 400,
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <h2 style={{ color: 'var(--color-text-primary)', marginTop: 0 }}>
                                New Workspace
                            </h2>
                            {createError && (
                                <div style={{ color: 'var(--color-danger)', fontSize: 14, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--color-bg-severity-critical)' }}>
                                    {createError}
                                </div>
                            )}
                            <div style={{ marginBottom: 16 }}>
                                <label
                                    style={{
                                        display: "block",
                                        color: 'var(--color-text-secondary)',
                                        marginBottom: 8,
                                        fontSize: 14,
                                    }}
                                >
                                    Workspace Name
                                </label>
                                <input
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. My Company"
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: 8,
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-background)',
                                        color: 'var(--color-text-primary)',
                                    }}
                                />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label
                                    style={{
                                        display: "block",
                                        color: 'var(--color-text-secondary)',
                                        marginBottom: 8,
                                        fontSize: 14,
                                    }}
                                >
                                    Description (Optional)
                                </label>
                                <input
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Brief description..."
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: 8,
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-background)',
                                        color: 'var(--color-text-primary)',
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    style={{
                                        padding: "8px 16px",
                                        background: "transparent",
                                        color: 'var(--color-text-secondary)',
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    style={{
                                        padding: "8px 16px",
                                        background: 'var(--color-primary)',
                                        color: 'var(--color-on-primary)',
                                        border: "none",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        opacity: creating ? 0.7 : 1,
                                    }}
                                >
                                    {creating ? "Creating..." : "Create Workspace"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>

            {/* Upgrade Modal */}
            <UpgradePlanModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
            />

            {/* Limit Reached Modal */}
            <LimitReachedModal
                isOpen={showLimitModal}
                onClose={() => setShowLimitModal(false)}
                resourceType="workspaces"
                currentCount={currentWorkspaceCount}
                maxLimit={planLimits.maxTenants}
                currentPlan={currentPlan}
            />
        </div>
        </motion.div>
    );
}

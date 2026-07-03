import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/commons/Sidebar";
import { ProjectsList } from "@/ui/components/ProjectsList";
import { useInvitations } from "@/hooks/useInvitations";
import { useProjects } from "@/hooks/useProjects";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { DetailSkeleton } from "@/components/commons/skeletons/DetailSkeleton";
import {
    Users,
    FolderOpen,
    ArrowLeft,
    Mail,
    Loader2,
    CheckCircle,
    XCircle,
    Trash2
} from "lucide-react";

export default function WorkspaceDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"projects" | "members">("projects");
    const workspaceId = id || null;

    // Invitations Hook
    const {
        invitations,
        isLoading: loadingInvites,
        error: inviteError,
        inviteMember,
        cancelInvitation
    } = useInvitations(workspaceId);

    // Projects Hook (for project selection in invitations)
    const { projects } = useProjects(workspaceId || "");

    // Invite Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("TENANT_USER");
    const [inviting, setInviting] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [allProjects, setAllProjects] = useState(true); // Default to all projects

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setInviting(true);
            // If "All Projects" is checked, don't send projectIds
            const projectIds = allProjects ? undefined : selectedProjects;
            await inviteMember(inviteEmail, inviteRole, projectIds);
            setIsInviteModalOpen(false);
            setInviteEmail("");
            setSelectedProjects([]);
            setAllProjects(true);
            toast.success("Invitation sent successfully!");
        } catch (err: any) {
            console.error("Failed to invite", err);

            const errorMessage = err.message || "Unknown error";

            if (errorMessage.includes("User limit reached") || errorMessage.includes("Upgrade your plan")) {
                toast.error("Member Limit Reached — Your current plan has reached its member limit. Upgrade to BASIC, PRO, or ENTERPRISE to invite more members.");
            } else if (errorMessage.includes("already invited") || errorMessage.includes("already exists")) {
                toast.error("This user has already been invited or is already a member of this workspace.");
            } else {
                toast.error(`Failed to send invitation: ${errorMessage}`);
            }
        } finally {
            setInviting(false);
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
                {/* Header */}
                <header
                    className="header"
                    style={{
                        background: 'var(--color-surface)',
                        borderBottom: '1px solid var(--color-border)',
                        padding: "0 24px",
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between"
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <button
                            onClick={() => navigate("/workspaces")}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: 'var(--color-text-secondary)',
                                display: "flex",
                                alignItems: "center"
                            }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{ color: 'var(--color-text-primary)', fontSize: 20, margin: 0 }}>
                            Workspace Dashboard
                        </h1>
                    </div>
                </header>

                {/* Tabs */}
                <div style={{
                    padding: "24px 24px 0",
                    borderBottom: '1px solid var(--color-border)',
                    display: "flex",
                    gap: 32
                }}>
                    <button
                        onClick={() => setActiveTab("projects")}
                        style={{
                            background: "transparent",
                            border: "none",
                            padding: "12px 4px",
                            cursor: "pointer",
                            borderBottom: activeTab === "projects" ? '2px solid var(--color-primary)' : "2px solid transparent",
                            color: activeTab === "projects" ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                        }}
                    >
                        <FolderOpen size={18} />
                        Projects
                    </button>
                    <button
                        onClick={() => setActiveTab("members")}
                        style={{
                            background: "transparent",
                            border: "none",
                            padding: "12px 4px",
                            cursor: "pointer",
                            borderBottom: activeTab === "members" ? '2px solid var(--color-primary)' : "2px solid transparent",
                            color: activeTab === "members" ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                        }}
                    >
                        <Users size={18} />
                        Members & Invitations
                    </button>
                </div>

                <section className="content" style={{ padding: 24 }}>
                    {/* PROJECTS TAB */}
                    {activeTab === "projects" && workspaceId && (
                        <ProjectsList workspaceId={workspaceId} />
                    )}

                    {/* MEMBERS TAB */}
                    {activeTab === "members" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ color: 'var(--color-text-primary)', margin: 0 }}>Pending Invitations</h3>
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "8px 16px",
                                        background: 'var(--color-primary)',
                                        color: 'var(--color-on-primary)',
                                        border: "none",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        fontWeight: 600
                                    }}
                                >
                                    <Mail size={16} />
                                    Invite Member
                                </button>
                            </div>

                            {loadingInvites && (
                                <DetailSkeleton rows={4} />
                            )}

                            {inviteError && (
                                <div style={{ color: 'var(--color-danger)', padding: 10 }}>Error: {inviteError}</div>
                            )}

                            {/* Invitations List */}
                            <div style={{ display: "grid", gap: 12 }}>
                                {!loadingInvites && invitations.length === 0 && (
                                    <div style={{ color: 'var(--color-text-secondary)', fontStyle: "italic" }}>No pending invitations.</div>
                                )}

                                {invitations.map((inv) => (
                                    <div
                                        key={inv.id}
                                        style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 8,
                                            padding: "16px 20px",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center"
                                        }}
                                    >
                                        <div>
                                            <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{inv.email}</div>
                                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: 13 }}>
                                                Role: {inv.role} • Status: <span style={{ color: 'var(--color-warning)' }}>{inv.status}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => cancelInvitation(inv.id)}
                                            style={{
                                                background: "transparent",
                                                border: "none",
                                                color: 'var(--color-danger)',
                                                cursor: "pointer",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 6
                                            }}
                                            title="Cancel Invitation"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Invite Modal */}
                {isInviteModalOpen && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            background: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 1000
                        }}
                    >
                        <form
                            onSubmit={handleInvite}
                            style={{
                                background: 'var(--color-surface)',
                                padding: 24,
                                borderRadius: 12,
                                width: 400,
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            <h2 style={{ color: 'var(--color-text-primary)', marginTop: 0 }}>Invite Member</h2>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: "block", color: 'var(--color-text-secondary)', marginBottom: 8, fontSize: 14 }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    autoFocus
                                    required
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="colleague@company.com"
                                    style={{
                                        width: "100%",
                                        padding: "10px",
                                        borderRadius: 8,
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-background)',
                                        color: 'var(--color-text-primary)'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: "block", color: 'var(--color-text-secondary)', marginBottom: 8, fontSize: 14 }}>
                                    Project Access
                                </label>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                        <input
                                            type="checkbox"
                                            checked={allProjects}
                                            onChange={(e) => {
                                                setAllProjects(e.target.checked);
                                                if (e.target.checked) {
                                                    setSelectedProjects([]);
                                                }
                                            }}
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
                                            All Projects (current and future)
                                        </span>
                                    </label>
                                </div>

                                {!allProjects && (
                                    <div>
                                        <label style={{ display: "block", color: 'var(--color-text-tertiary)', marginBottom: 8, fontSize: 13 }}>
                                            Select specific projects:
                                        </label>
                                        <div style={{
                                            maxHeight: 150,
                                            overflowY: "auto",
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 8,
                                            padding: 8,
                                            background: 'var(--color-background)'
                                        }}>
                                            {projects.length === 0 ? (
                                                <p style={{ color: 'var(--color-text-tertiary)', fontSize: 13, textAlign: "center", padding: 8 }}>
                                                    No projects available
                                                </p>
                                            ) : (
                                                projects.map((project: any) => (
                                                    <label
                                                        key={project.id}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: 8,
                                                            padding: "6px 8px",
                                                            cursor: "pointer",
                                                            borderRadius: 4,
                                                            transition: "background 0.2s"
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'var(--color-surface)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = "transparent";
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedProjects.includes(project.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedProjects([...selectedProjects, project.id]);
                                                                } else {
                                                                    setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                                                                }
                                                            }}
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                        <span style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
                                                            {project.name}
                                                        </span>
                                                    </label>
                                                ))
                                            )}
                                        </div>
                                        {!allProjects && selectedProjects.length === 0 && (
                                            <p style={{ color: 'var(--color-warning)', fontSize: 12, marginTop: 8 }}>
                                                ⚠️ Please select at least one project or check "All Projects"
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsInviteModalOpen(false)}
                                    style={{
                                        padding: "8px 16px",
                                        background: "transparent",
                                        color: 'var(--color-text-secondary)',
                                        border: "none",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting || (!allProjects && selectedProjects.length === 0)}
                                    style={{
                                        padding: "8px 16px",
                                        background: 'var(--color-primary)',
                                        color: 'var(--color-on-primary)',
                                        border: "none",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        opacity: (inviting || (!allProjects && selectedProjects.length === 0)) ? 0.7 : 1
                                    }}
                                >
                                    {inviting ? "Sending..." : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
        </motion.div>
    );
}

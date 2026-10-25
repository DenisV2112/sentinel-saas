import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/commons/Sidebar';
import { useProjects } from '@/hooks/useProjects';
import { useScans } from '@/hooks/useScans';
import { useTheme } from '@/utils/store/themeContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { DetailSkeleton } from '@/components/commons/skeletons/DetailSkeleton';
import { TableSkeleton } from '@/components/commons/skeletons/TableSkeleton';
import { StateWrapper } from '@components/StateWrapper';

export const ProjectDetailPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const currentTenantId = localStorage.getItem('tenantId');

    const { projects, isLoading: projectsLoading, projectsMap, updateProject, deleteProject, error, refetch } = useProjects(currentTenantId || '');
    const { scans, isLoading: scansLoading, error: scansError, startScan, refetch: refetchScans } = useScans(currentTenantId);

    const [activeTab, setActiveTab] = useState<'overview' | 'scans' | 'domains' | 'repos'>('overview');
    const [project, setProject] = useState<any>(null);
    const [startingScan, setStartingScan] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [saving, setSaving] = useState(false);

    // Derive project from useProjects cache
    const cachedProject = projectsMap.get(projectId ?? '');
    const loadingProject = projectsLoading;
    const projectError = error;
    const isNotFound = !loadingProject && !cachedProject && !projectError;

    // Fallback: use the project from the cache or the locally managed one
    const displayProject = cachedProject ?? project;

    // When the cached project loads after initial render, sync it to local state
    React.useEffect(() => {
        if (cachedProject) {
            setProject(cachedProject);
        }
    }, [cachedProject]);

    const [showScanModal, setShowScanModal] = useState(false);
    const [scanForm, setScanForm] = useState({
        repoUrl: '',
        targetUrl: '',
        scanType: 'FULL'
    });

    const handleStartScan = async (e: React.FormEvent) => {
        e.preventDefault();

        // Robust ID retrieval
        const tenantIdToUse = currentTenantId || displayProject?.tenantId;

        if (!projectId) {
            toast.error('Project ID is missing');
            return;
        }
        if (!tenantIdToUse) {
            toast.error('Tenant ID not found. Wait for project to load.');
            return;
        }

        setStartingScan(true);
        try {
            await startScan({
                projectId,
                scanType: scanForm.scanType,
                targetRepo: scanForm.repoUrl,
                targetUrl: scanForm.targetUrl || undefined
            });
            toast.success('Scan started successfully!');
            setShowScanModal(false);
            setScanForm({ repoUrl: '', targetUrl: '', scanType: 'FULL' });
            refetchScans();
        } catch (error) {
            toast.error('Failed to start scan');
        } finally {
            setStartingScan(false);
        }
    };

    const handleEditProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        try {
            setSaving(true);
            await updateProject(projectId, { name: editName, description: editDescription });
            if (displayProject) {
                setProject({ ...displayProject, name: editName, description: editDescription });
            }
            setShowEditModal(false);
            toast.success('Project updated successfully!');
        } catch (error) {
            toast.error('Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProject = async () => {
        if (!projectId) return;
        try {
            setSaving(true);
            await deleteProject(projectId);
            setShowDeleteModal(false);
            toast.success('Project deleted successfully!');
            navigate('/workspaces');
        } catch (error) {
            toast.error('Failed to delete project');
        } finally {
            setSaving(false);
        }
    };

    // Initialize edit form when modal opens
    React.useEffect(() => {
        if (showEditModal && displayProject) {
            setEditName(displayProject.name);
            setEditDescription(displayProject.description || '');
        }
    }, [showEditModal, displayProject]);


    if (loadingProject) {
        return (
            <Sidebar>
                <div style={{
                    minHeight: '100vh',
                    background: 'var(--color-background)',
                    padding: 24,
                }}>
                    <DetailSkeleton rows={6} />
                </div>
            </Sidebar>
        );
    }

    // ── Error state: 404 Not Found ─────────────────────────────
    if (isNotFound) {
        return (
            <Sidebar>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'var(--color-background)',
                    padding: 24,
                }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 12,
                        padding: 32,
                        maxWidth: 480,
                        width: '100%',
                        textAlign: 'center',
                        border: '1px solid var(--color-border)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                        <h2 style={{ color: 'var(--color-text-primary)', marginTop: 0, marginBottom: 12 }}>
                            Project not found
                        </h2>
                        <p className="text-secondary" style={{ marginBottom: 24 }}>
                            Project not found or access denied.
                        </p>
                        <button
                            onClick={() => navigate('/workspaces')}
                            style={{
                                padding: '10px 24px',
                                background: 'var(--color-primary)',
                                color: 'var(--color-on-primary)',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500,
                            }}
                        >
                            ← Back to Projects
                        </button>
                    </div>
                </div>
            </Sidebar>
        );
    }

    // ── Error state: Network / other errors ────────────────────
    if (projectError) {
        return (
            <Sidebar>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'var(--color-background)',
                    padding: 24,
                }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 12,
                        padding: 32,
                        maxWidth: 480,
                        width: '100%',
                        textAlign: 'center',
                        border: '1px solid var(--color-border)',
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                        <h2 style={{ color: 'var(--color-text-primary)', marginTop: 0, marginBottom: 12 }}>
                            Network error
                        </h2>
                        <p className="text-secondary" style={{ marginBottom: 24 }}>
                            {projectError}
                        </p>
                        <button
                            onClick={() => refetch()}
                            style={{
                                padding: '10px 24px',
                                background: 'var(--color-primary)',
                                color: 'var(--color-on-primary)',
                                border: 'none',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500,
                            }}
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </Sidebar>
        );
    }

    // ── Project loaded: normal rendering ───────────────────────

    const projectScans = scans.filter((scan: any) => scan.projectId === projectId);

    // Ensure displayProject exists before rendering
    if (!displayProject) {
        return null;
    }

    return (
        <Sidebar>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: 24 }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    {/* Header */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 12,
                        padding: 24,
                        marginBottom: 24,
                        border: '1px solid var(--color-border)'
                    }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 14,
                                padding: 0
                            }}
                        >
                            ← Back to Workspace
                        </button>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
                                    {displayProject.name}
                                </h1>
                                <p className="text-secondary" style={{ marginTop: 8, margin: 0 }}>
                                    {displayProject.description || 'No description'}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        background: 'transparent',
                                        color: 'var(--color-text-secondary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontSize: 14
                                    }}
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        background: 'var(--color-danger)',
                                        color: 'var(--color-on-primary)',
                                        border: 'none',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontSize: 14
                                    }}
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        background: 'var(--color-surface)',
                        borderRadius: 12,
                        marginBottom: 24,
                        border: '1px solid var(--color-border)'
                    }}>
                        <div style={{ borderBottom: '1px solid var(--color-border)' }}>
                            <nav style={{ display: 'flex', gap: 32, padding: '0 24px' }}>
                                {(['overview', 'scans', 'domains', 'repos'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        style={{
                                            padding: '16px 8px',
                                            borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                                            background: 'transparent',
                                            border: 'none',
                                            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                            fontWeight: 500,
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div style={{ padding: 24 }}>
                            {activeTab === 'overview' && (
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-primary)' }}>
                                        Project Overview
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                        <div style={{ background: 'var(--color-background)', padding: 16, borderRadius: 8 }}>
                                            <p style={{ fontSize: 14, margin: 0 }} className="text-secondary">Project ID</p>
                                            <p style={{ fontFamily: 'monospace', fontSize: 14, marginTop: 4, color: 'var(--color-text-primary)' }}>
                                                {displayProject.id}
                                            </p>
                                        </div>
                                        <div style={{ background: 'var(--color-background)', padding: 16, borderRadius: 8 }}>
                                            <p style={{ fontSize: 14, margin: 0 }} className="text-secondary">Status</p>
                                            <p style={{ fontWeight: 600, marginTop: 4, color: 'var(--color-text-primary)' }}>
                                                {displayProject.status}
                                            </p>
                                        </div>
                                        <div style={{ background: 'var(--color-background)', padding: 16, borderRadius: 8 }}>
                                            <p style={{ fontSize: 14, margin: 0 }} className="text-secondary">Created</p>
                                            <p style={{ fontSize: 14, marginTop: 4, color: 'var(--color-text-primary)' }}>
                                                {new Date(displayProject.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div style={{ background: 'var(--color-background)', padding: 16, borderRadius: 8 }}>
                                            <p style={{ fontSize: 14, margin: 0 }} className="text-secondary">Total Scans</p>
                                            <p style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: 'var(--color-text-primary)' }}>
                                                {projectScans.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'scans' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Security Scans</h2>
                                        <button
                                            onClick={() => setShowScanModal(true)}
                                            disabled={startingScan}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                background: 'var(--color-primary)',
                                                color: 'var(--color-on-primary)',
                                                padding: '8px 16px',
                                                borderRadius: 8,
                                                border: 'none',
                                                fontWeight: 500,
                                                cursor: startingScan ? 'not-allowed' : 'pointer',
                                                opacity: startingScan ? 0.6 : 1,
                                                fontSize: 14
                                            }}
                                        >
                                            {startingScan ? 'Starting...' : 'New Scan'}
                                        </button>
                                    </div>

                                    {/* Scan Modal */}
                                    {showScanModal && (
                                        <div style={{
                                            position: 'fixed',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            background: 'rgba(0,0,0,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 1000
                                        }}>
                                            <div style={{
                                                background: 'var(--color-surface)',
                                                padding: 24,
                                                borderRadius: 12,
                                                width: '100%',
                                                maxWidth: 500,
                                                border: '1px solid var(--color-border)'
                                            }}>
                                                <h3 style={{ marginTop: 0, marginBottom: 16, color: 'var(--color-text-primary)' }}>Start Security Scan</h3>
                                                <form onSubmit={handleStartScan}>
                                                    <div style={{ marginBottom: 16 }}>
                                                        <label style={{ display: 'block', marginBottom: 8 }} className="text-secondary">
                                                            Target Repository URL {['SAST', 'SCA', 'FULL'].includes(scanForm.scanType) && '(Required)'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            required={['SAST', 'SCA', 'FULL'].includes(scanForm.scanType)}
                                                            placeholder="https://github.com/user/repo.git"
                                                            value={scanForm.repoUrl}
                                                            onChange={(e) => setScanForm({ ...scanForm, repoUrl: e.target.value })}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                borderRadius: 6,
                                                                border: '1px solid var(--color-border)',
                                                                background: 'var(--color-background)',
                                                                color: 'var(--color-text-primary)'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ marginBottom: 16 }}>
                                                        <label style={{ display: 'block', marginBottom: 8 }} className="text-secondary">
                                                            Target URL {['DAST', 'CONTAINER'].includes(scanForm.scanType) && '(Required for DAST/Container)'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="https://example.com"
                                                            value={scanForm.targetUrl}
                                                            onChange={(e) => setScanForm({ ...scanForm, targetUrl: e.target.value })}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                borderRadius: 6,
                                                                border: '1px solid var(--color-border)',
                                                                background: 'var(--color-background)',
                                                                color: 'var(--color-text-primary)'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ marginBottom: 24 }}>
                                                        <label style={{ display: 'block', marginBottom: 8 }} className="text-secondary">Scan Type</label>
                                                        <select
                                                            value={scanForm.scanType}
                                                            onChange={(e) => setScanForm({ ...scanForm, scanType: e.target.value })}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                borderRadius: 6,
                                                                border: '1px solid var(--color-border)',
                                                                background: 'var(--color-background)',
                                                                color: 'var(--color-text-primary)'
                                                            }}
                                                        >
                                                            <option value="SAST">SAST (Static Analysis)</option>
                                                            <option value="DAST">DAST (Dynamic Analysis)</option>
                                                            <option value="CONTAINER">Container Scan (Trivy)</option>
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowScanModal(false)}
                                                            style={{
                                                                padding: '8px 16px',
                                                                border: '1px solid var(--color-border)',
                                                                background: 'transparent',
                                                                color: 'var(--color-text-primary)',
                                                                borderRadius: 6,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="submit"
                                                            disabled={startingScan}
                                                            style={{
                                                                padding: '8px 16px',
                                                                background: 'var(--color-primary)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 6,
                                                                cursor: 'pointer',
                                                                opacity: startingScan ? 0.7 : 1
                                                            }}
                                                        >
                                                            {startingScan ? 'Starting...' : 'Start Scan'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    )}

                                    {scansLoading ? (
                                        <TableSkeleton columns={4} rows={3} />
                                    ) : scansError ? (
                                        <StateWrapper
                                            isLoading={false}
                                            isError
                                            isEmpty={false}
                                            skeleton={null}
                                            errorMessage={`Failed to load scans: ${scansError}`}
                                            onRetry={() => refetchScans()}
                                        >
                                            {null}
                                        </StateWrapper>
                                    ) : projectScans.length === 0 ? (
                                        <p className="text-secondary">No scans yet. Start your first scan!</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {projectScans.map((scan: any) => (
                                                <div
                                                    key={scan.id}
                                                    style={{
                                                        background: 'var(--color-background)',
                                                        padding: 16,
                                                        borderRadius: 8,
                                                        border: '1px solid var(--color-border)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                        <div>
                                                            <p style={{ fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
                                                                Scan #{scan.id.substring(0, 8)}
                                                            </p>
                                                            <p style={{ fontSize: 14, marginTop: 4 }} className="text-secondary">
                                                                {new Date(scan.createdAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <span style={{
                                                            padding: '4px 12px',
                                                            borderRadius: 12,
                                                            fontSize: 12,
                                                            fontWeight: 500,
                                                            background: scan.status === 'COMPLETED' ? 'var(--color-success)' : scan.status === 'RUNNING' ? 'var(--color-info)' : 'var(--color-text-tertiary)',
                                                            color: 'white'
                                                        }}>
                                                            {scan.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'domains' && (
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-primary)' }}>Domains</h2>
                                    <p className="text-secondary">Domain management coming soon...</p>
                                </div>
                            )}

                            {activeTab === 'repos' && (
                                <div>
                                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: 'var(--color-text-primary)' }}>Repositories</h2>
                                    <p className="text-secondary">Repository management coming soon...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Project Modal */}
            {showEditModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <form onSubmit={handleEditProject} style={{
                        background: 'var(--color-surface)',
                        padding: 24,
                        borderRadius: 12,
                        width: 400,
                        border: '1px solid var(--color-border)'
                    }}>
                        <h2 style={{ color: 'var(--color-text-primary)', marginTop: 0 }}>Edit Project</h2>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }} className="text-secondary">
                                Project Name
                            </label>
                            <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-background)',
                                    color: 'var(--color-text-primary)'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 14 }} className="text-secondary">
                                Description
                            </label>
                            <input
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: 8,
                                    border: '1px solid var(--color-border)',
                                    background: 'var(--color-background)',
                                    color: 'var(--color-text-primary)'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    color: 'var(--color-text-secondary)',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--color-primary)',
                                    color: 'var(--color-on-primary)',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Project Modal */}
            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        padding: 24,
                        borderRadius: 12,
                        width: 400,
                        border: '1px solid var(--color-border)'
                    }}>
                        <h2 style={{ color: 'var(--color-text-primary)', marginTop: 0 }}>Delete Project</h2>
                        <p className="text-secondary" style={{ marginBottom: 24 }}>
                            Are you sure you want to delete <strong>{displayProject.name}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'transparent',
                                    color: 'var(--color-text-secondary)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 8,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteProject}
                                disabled={saving}
                                style={{
                                    padding: '8px 16px',
                                    background: 'var(--color-danger)',
                                    color: 'var(--color-on-primary)',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Deleting...' : 'Delete Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </motion.div>
        </Sidebar>
    );
};

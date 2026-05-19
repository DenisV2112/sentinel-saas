import React, { useState } from "react";
import Sidebar from "@/components/commons/Sidebar";
import { useTheme } from "@/utils/store/themeContext";
import {
  Folder,
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  Search,
  Plus,
  Edit,
  BarChart3,
  Trash2,
} from "lucide-react";
import { useProjects } from "@hooks/useProjects";

export default function ProjectsPage() {
  const { theme } = useTheme();

  const tenantId = localStorage.getItem("tenantId");
  const {
    projects: apiProjects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch,
  } = useProjects(tenantId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [riskFilter, setRiskFilter] = useState("Risk Level");

  /* ── New Project form ── */
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  /* ── Edit state ── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  /* ── Derived data ── */
  const projects = apiProjects ?? [];

  /* ── Stats from project data ── */
  const total = projects.length;
  const criticalRisk = 0; // Project API doesn't expose vulnerability counts
  const highRisk = 0; // Project API doesn't expose vulnerability counts
  const healthy = projects.filter(
    (p: any) => p.domainCount > 0 || p.repoCount > 0
  ).length;

  /* ── Filtered projects ── */
  const filteredProjects = projects.filter((p: any) => {
    if (
      search &&
      !p.name?.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  /* ── Handlers ── */
  const handleCreate = async () => {
    setFormError(null);
    if (!newName.trim()) {
      setFormError("Project name is required");
      return;
    }
    try {
      await createProject({ name: newName, description: newDesc || undefined });
      setShowNewProject(false);
      setNewName("");
      setNewDesc("");
    } catch (e: any) {
      setFormError(e.message || "Failed to create project");
    }
  };

  const handleUpdate = async (projectId: string) => {
    try {
      await updateProject(projectId, {
        name: editName,
        description: editDesc || undefined,
      });
      setEditingId(null);
      setEditName("");
      setEditDesc("");
    } catch (e: any) {
      console.error("Failed to update project:", e);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await deleteProject(projectId);
    } catch (e: any) {
      console.error("Failed to delete project:", e);
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditDesc(p.description || "");
  };

  return (
    <div className="projects-layout">
      <Sidebar />

      <main className="projects-main">
        {/* HEADER */}
        <header className="projects-header">
          <h1 style={{ color: theme.colors.text.primary }}>Projects</h1>

          <div className="header-actions">
            <div
              className="search"
              style={{
                background: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <Search size={18} />
              <input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ color: theme.colors.text.primary }}
              />
            </div>

            <button
              className="primary-btn"
              style={{
                background: theme.colors.primary,
                color: theme.colors.onPrimary,
              }}
              onClick={() => setShowNewProject(!showNewProject)}
            >
              <Plus size={18} />
              New Project
            </button>
          </div>
        </header>

        {/* NEW PROJECT INLINE FORM */}
        {showNewProject && (
          <div
            style={{
              margin: "20px 20px 0",
              padding: 20,
              borderRadius: 16,
              background: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3 style={{ color: theme.colors.text.primary, fontSize: 16 }}>
              Create New Project
            </h3>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                placeholder="Project Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.surface,
                  color: theme.colors.text.primary,
                  flex: 1,
                  minWidth: 200,
                }}
              />
              <input
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.surface,
                  color: theme.colors.text.primary,
                  flex: 1,
                  minWidth: 200,
                }}
              />
            </div>

            {formError && (
              <span style={{ color: theme.colors.danger, fontSize: 13 }}>
                {formError}
              </span>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="primary-btn"
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.onPrimary,
                }}
                onClick={handleCreate}
              >
                Create Project
              </button>
              <button
                className="filter-btn"
                onClick={() => {
                  setShowNewProject(false);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* LOADING / ERROR STATES */}
        {loading && (
          <div style={{ padding: 20, color: theme.colors.text.secondary }}>
            Loading projects...
          </div>
        )}

        {error && !loading && (
          <div
            style={{
              margin: 20,
              padding: "12px 20px",
              borderRadius: 12,
              background: theme.colors.danger,
              color: theme.colors.onPrimary || "#fff",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* NO TENANT STATE */}
        {!tenantId && !loading && (
          <div style={{ padding: 40, textAlign: "center", color: theme.colors.text.secondary }}>
            <Folder size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>Select a tenant to view projects</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {tenantId && !loading && !error && filteredProjects.length === 0 && !showNewProject && (
          <div style={{ padding: 40, textAlign: "center", color: theme.colors.text.secondary }}>
            <Folder size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No projects yet. Create your first project.</p>
          </div>
        )}

        {/* STATS */}
        <section className="projects-overview">
          <StatCard icon={<Folder />} label="Total Projects" value={total} theme={theme} />
          <StatCard icon={<ShieldAlert />} label="Critical Risk" value={criticalRisk} danger theme={theme} />
          <StatCard icon={<AlertTriangle />} label="High Risk" value={highRisk} warning theme={theme} />
          <StatCard icon={<ShieldCheck />} label="Healthy" value={healthy} success theme={theme} />
        </section>

        {/* FILTERS */}
        <section
          className="filters"
          style={{
            background: theme.colors.surface,
            borderColor: theme.colors.border,
          }}
        >
          <div className="search">
            <Search size={16} />
            <input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Archived</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option>Risk Level</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </section>

        {/* TABLE */}
        {filteredProjects.length > 0 && (
          <section
            className="table-wrapper"
            style={{
              background: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Status</th>
                  <th>Security Health</th>
                  <th>Vulnerabilities</th>
                  <th>Last Scan</th>
                  <th align="right">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredProjects.map((p: any) => (
                  <tr key={p.id ?? p.name}>
                    <td>
                      <div className="project-info">
                        <div className="project-avatar">
                          {p.name ? p.name.slice(0, 2).toUpperCase() : "??"}
                        </div>
                        <div>
                          {editingId === p.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: `1px solid ${theme.colors.border}`,
                                  background: theme.colors.background,
                                  color: theme.colors.text.primary,
                                }}
                              />
                              <input
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                placeholder="Description"
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: `1px solid ${theme.colors.border}`,
                                  background: theme.colors.background,
                                  color: theme.colors.text.secondary,
                                  fontSize: 12,
                                }}
                              />
                              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                                <button
                                  className="primary-btn"
                                  style={{
                                    background: theme.colors.primary,
                                    color: theme.colors.onPrimary,
                                    padding: "4px 10px",
                                    fontSize: 12,
                                  }}
                                  onClick={() => handleUpdate(p.id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="filter-btn"
                                  onClick={() => setEditingId(null)}
                                  style={{ fontSize: 12, padding: "4px 10px" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="name">{p.name}</span>
                              <span className="muted">
                                {p.description || `Domains: ${p.domainCount ?? 0} | Repos: ${p.repoCount ?? 0}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="tag">ACTIVE</span>
                    </td>

                    <td>
                      <span className="tag">
                        {(p.domainCount ?? 0) > 0 || (p.repoCount ?? 0) > 0
                          ? "PASSED"
                          : "INACTIVE"}
                      </span>
                    </td>

                    <td>
                      <span className="risk-high">0</span>{" "}
                      <span className="risk-medium">0</span>{" "}
                      <span className="risk-low">0</span>
                    </td>

                    <td>
                      <span>N/A</span>
                      <span className="muted">
                        Created:{" "}
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </td>

                    <td align="right">
                      <button
                        className="icon-btn"
                        onClick={() => startEdit(p)}
                      >
                        <Edit size={16} />
                      </button>
                      <button className="icon-btn">
                        <BarChart3 size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            <footer className="pagination">
              <span>
                Showing {filteredProjects.length} of {total} projects
              </span>
              <div>
                <button disabled>Previous</button>
                <button>Next</button>
              </div>
            </footer>
          </section>
        )}
      </main>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function StatCard({ icon, label, value, danger, warning, success, theme }: any) {
  let color = theme.colors.text.primary;
  if (danger) color = theme.colors.danger;
  if (warning) color = theme.colors.warning;
  if (success) color = theme.colors.success;

  return (
    <div
      className="overview-card"
      style={{
        background: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <div>
        <p className="overview-title">{label}</p>
        <span className="overview-value" style={{ color }}>
          {value}
        </span>
      </div>
      {icon}
    </div>
  );
}

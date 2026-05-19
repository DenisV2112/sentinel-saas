import React, { useState } from "react";
import Sidebar from "@/components/commons/Sidebar";
import StatCard from "@/components/StatCard"; 
import FindingsTable, { type Finding } from "@/components/FindingsTable";
import { useTheme } from "@/utils/store/themeContext";
import { useFindings } from "@hooks/useFindings";
import type { UnifiedVulnerability } from "@/types/scanResults";
import {
  Search,
  Bell,
  Download,
  Plus,
  Filter,
  ChevronDown,
  X,
} from "lucide-react";

/* ─── Severity value mapping: UnifiedVulnerability (UPPER) → Finding (Pascal) ─── */
const SEVERITY_MAP: Record<string, Finding["severity"]> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Low",
};

/* ─── Map UnifiedVulnerability → Finding for the table ─── */
function mapToFinding(v: UnifiedVulnerability): Finding {
  const locationParts: string[] = [];
  if (v.file) locationParts.push(v.file);
  if (v.line != null) locationParts.push(String(v.line));
  return {
    id: v.id ?? "unknown",
    cve: v.cve ?? null,
    description: v.title ?? v.description ?? "Untitled",
    severity: SEVERITY_MAP[v.severity] ?? "Low",
    project: v.package ?? v.url ?? "N/A",
    location: locationParts.length > 0 ? locationParts.join(":") : "N/A",
    status: "Open",
    discovered: "N/A",
    isFixed: false,
  };
}

/* ─── Compute stat cards from findings array ─── */
function computeStats(mapped: Finding[]) {
  const critical = mapped.filter((f) => f.severity === "Critical").length;
  const high = mapped.filter((f) => f.severity === "High").length;
  const total = mapped.length;

  return [
    {
      title: "Critical Findings",
      value: String(critical),
      icon: "ShieldAlert" as const,
      iconColor: "#EF4444",
      change: critical > 0 ? "+" + critical : "0",
      changeType: "up" as const,
    },
    {
      title: "High Severity",
      value: String(high),
      icon: "AlertTriangle" as const,
      iconColor: "#F59E0B",
      change: "Active",
      changeType: "no-change" as const,
    },
    {
      title: "Total Open",
      value: String(total),
      icon: "Target" as const,
      iconColor: "#FF1B6D",
      change: total > 0 ? "Active" : "0",
      changeContext: "findings",
      changeType: "no-change" as const,
    },
    {
      title: "MTTR",
      value: "--",
      icon: "Clock" as const,
      iconColor: "#10B981",
      change: "N/A",
      changeType: "no-change" as const,
      hasChart: true,
    },
  ];
}

const SEVERITY_OPTIONS = ["Critical", "High", "Medium", "Low"] as const;
const STATUS_OPTIONS = ["Open", "In Review", "Fixed"] as const;

export default function FindingsPage() {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [showSeverityMenu, setShowSeverityMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { data: rawFindings, loading, error, filter, setFilter } = useFindings();

  // VERIFICACIÓN DE SEGURIDAD: Si theme no está disponible, mostrar error visible.
  if (!theme || !theme.colors) {
      console.error("CRITICAL: Theme context is undefined. Is the app wrapped in ThemeProvider?");
      return (
         <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#FFF' }}>
            <h1>Theme Unavailable</h1>
            <p>Please check your ThemeProvider setup.</p>
         </div>
      );
  }
  
  // ALIAS CORRECTO: Acceso directo a theme.colors (estructura plana de ThemeConfig)
  const c = theme.colors;

  /* ─── Map + filter findings ─── */
  const allFindings: Finding[] = (rawFindings ?? []).map(mapToFinding);

  const filteredFindings = allFindings.filter((f) => {
    /* severity filter */
    if (filter.severity && f.severity !== filter.severity) return false;
    /* status filter — map UI status to Finding status */
    if (filter.status) {
      const mappedStatus = filter.status as Finding["status"];
      if (mappedStatus === "Open" || mappedStatus === "In Review" || mappedStatus === "Fixed") {
        if (f.status !== mappedStatus) return false;
      }
    }
    /* text search */
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.id.toLowerCase().includes(q) ||
        (f.cve && f.cve.toLowerCase().includes(q)) ||
        f.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = computeStats(allFindings);

  /* ─── filter handlers ─── */
  const handleSeveritySelect = (sev: string) => {
    setFilter({ severity: filter.severity === sev ? null : sev });
    setShowSeverityMenu(false);
  };

  const handleStatusSelect = (status: string) => {
    setFilter({ status: filter.status === status ? null : status });
    setShowStatusMenu(false);
  };

  const handleReset = () => {
    setFilter({ severity: null, status: null });
    setSearch("");
  };

  const layoutStyle = {
    background: c.background, 
  };
  const headerStyle = {
    background: c.surface, 
    borderBottom: `1px solid ${c.border}`,
  };

  /* ─── dropdown shared style ─── */
  const dropdownMenuStyle: React.CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    zIndex: 50,
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    padding: 4,
    minWidth: 150,
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  };

  const dropdownItemStyle = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.85rem",
    background: active ? c.primary : "transparent",
    color: active ? c.onPrimary : c.text.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  });

  return (
    <div className="findings-layout app" style={layoutStyle}>
      <Sidebar activeItem="findings" /> 

      <main className="findings-main main">
        {/* HEADER */}
        <header className="findings-header header" style={headerStyle}>
          <h1 style={{ color: c.text.primary, fontSize: '1.5rem', fontWeight: 700 }}>
            Security Findings
          </h1>

          <div className="header-actions">
            {/* Search */}
            <div style={{ position: "relative" }}>
                <Search
                    size={16}
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: 12,
                        transform: "translateY(-50%)",
                        color: c.text.tertiary,
                    }}
                />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search findings (ID, CVE, Desc)..."
                    style={{
                        paddingLeft: 36,
                        background: c.background,
                        borderColor: c.border,
                        color: c.text.primary,
                        borderRadius: '0.5rem',
                        padding: '0.5rem 0.625rem 0.5rem 2.5rem',
                        borderWidth: '1px',
                        fontSize: '0.875rem'
                    }}
                />
            </div>
            {/* Notification Bell */}
            <button className="icon-btn" style={{ color: c.text.secondary }}>
              <Bell size={22} />
              <span className="notification-dot" style={{ backgroundColor: c.danger }}/>
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <section className="page-content-scrollable content">
          {/* LOADING / ERROR STATES */}
          {loading && (
            <div style={{ padding: "20px 0", color: c.text.secondary, fontSize: "0.9rem" }}>
              Loading findings from completed scans...
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 20px",
                borderRadius: 12,
                background: c.danger,
                color: c.onPrimary || "#fff",
                fontSize: 14,
              }}
            >
              Failed to load findings: {error}
            </div>
          )}

          {/* Statistics Row */}
          <div className="stats-grid kpis">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} theme={theme} />
            ))}
          </div>

          {/* Filters & Actions Toolbar */}
          <div className="toolbar" style={{ marginTop: '0.5rem' }}>
            <div className="filters-group">
              {/* Severity Filter */}
              <div style={{ position: "relative" }}>
                <button 
                  className="filter-btn"
                  onClick={() => { setShowSeverityMenu(!showSeverityMenu); setShowStatusMenu(false); }}
                  style={{ background: c.surface, borderColor: c.border, color: filter.severity ? c.primary : c.text.secondary }}
                >
                  <Filter size={18} style={{ color: filter.severity ? c.primary : c.text.secondary }} />
                  {filter.severity ? filter.severity : "Severity"}
                  <ChevronDown size={18} />
                </button>
                {showSeverityMenu && (
                  <div style={dropdownMenuStyle}>
                    {SEVERITY_OPTIONS.map((sev) => (
                      <div
                        key={sev}
                        style={dropdownItemStyle(filter.severity === sev)}
                        onClick={() => handleSeveritySelect(sev)}
                      >
                        {sev}
                        {filter.severity === sev && <X size={14} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Status Filter */}
              <div style={{ position: "relative" }}>
                <button 
                  className="filter-btn"
                  onClick={() => { setShowStatusMenu(!showStatusMenu); setShowSeverityMenu(false); }}
                  style={{ background: c.surface, borderColor: c.border, color: filter.status ? c.primary : c.text.secondary }}
                >
                  Status: <span className="highlight" style={{ color: filter.status ? c.primary : c.primary, fontWeight: 600 }}>{filter.status || "Open"}</span>
                  <ChevronDown size={18} />
                </button>
                {showStatusMenu && (
                  <div style={dropdownMenuStyle}>
                    {STATUS_OPTIONS.map((st) => (
                      <div
                        key={st}
                        style={dropdownItemStyle(filter.status === st)}
                        onClick={() => handleStatusSelect(st)}
                      >
                        {st}
                        {filter.status === st && <X size={14} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button 
                className="reset-btn" 
                onClick={handleReset}
                style={{ color: c.text.tertiary, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
            
            <div className="actions-group">
              <button 
                className="action-btn secondary btn-outline"
                style={{ 
                    borderColor: c.primary, 
                    color: c.primary, 
                    background: c.surface 
                }}
              >
                <Download size={18} />
                Export
              </button>
              <button 
                className="action-btn primary btn-primary"
                style={{ background: c.primary, color: c.onPrimary, border: `1px solid ${c.primary}` }}
              >
                <Plus size={18} />
                Manual Finding
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div 
            className="card"
            style={{ 
              background: c.surface, 
              borderColor: c.border,
              marginTop: '1.5rem',
              padding: 0 
            }}
          >
            <FindingsTable theme={theme} findings={filteredFindings} /> 
          </div>
        </section>
      </main>
    </div>
  );
}
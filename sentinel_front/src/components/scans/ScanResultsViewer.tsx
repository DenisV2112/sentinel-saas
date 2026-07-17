import React, { useState } from 'react';
import type { UnifiedVulnerability, SASTResults, DASTResults, ContainerResults } from '../../types/scanResults';
import { AlertTriangle, CheckCircle, Info, XCircle, ChevronDown, ChevronRight, Code, FileText, Package, Globe } from 'lucide-react';

// ponytail: inlined from dead scanResultsParser.ts — single-use, no need for separate file

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_COLORS: Record<Severity, string> = {
    CRITICAL: 'var(--color-danger)',
    HIGH: 'var(--color-warning)',
    MEDIUM: 'var(--color-info)',
    LOW: 'var(--color-success)',
    INFO: 'var(--color-text-tertiary)',
};
const SEVERITY_BG: Record<Severity, string> = {
    CRITICAL: 'var(--color-bg-severity-critical)',
    HIGH: 'var(--color-bg-severity-high)',
    MEDIUM: 'var(--color-bg-severity-medium)',
    LOW: 'var(--color-bg-severity-low)',
    INFO: 'var(--color-surface)',
};
const SEVERITY_TINT: Record<Severity, string> = {
    CRITICAL: 'rgba(239,68,68,0.08)',
    HIGH: 'rgba(249,115,22,0.08)',
    MEDIUM: 'rgba(234,179,8,0.08)',
    LOW: 'rgba(34,197,94,0.08)',
    INFO: 'rgba(100,116,139,0.08)',
};

function getSeverityColor(s: string): string { return SEVERITY_COLORS[s as Severity] ?? SEVERITY_COLORS.INFO; }
function getSeverityBgColor(s: string): string { return SEVERITY_BG[s as Severity] ?? SEVERITY_BG.INFO; }
function getStatTintColor(s: string): string { return SEVERITY_TINT[s as Severity] ?? SEVERITY_TINT.INFO; }
function groupBySeverity(vulns: UnifiedVulnerability[]): Record<string, UnifiedVulnerability[]> {
    const g: Record<string, UnifiedVulnerability[]> = {};
    for (const v of vulns) { (g[v.severity] ??= []).push(v); }
    return g;
}
function getSeverityStats(vulns: UnifiedVulnerability[]): Record<string, number> {
    const s: Record<string, number> = { TOTAL: vulns.length, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
    for (const v of vulns) { s[v.severity] = (s[v.severity] ?? 0) + 1; }
    return s;
}

function parseScanResults(scan: any): UnifiedVulnerability[] {
    const results: UnifiedVulnerability[] = [];
    const raw = scan?.results ?? scan?.findings;
    if (!raw) return results;

    // SAST (Semgrep)
    const semgrep = (raw as SASTResults)?.results;
    if (semgrep?.length) {
        for (const f of semgrep) {
            results.push({
                id: f.check_id,
                title: f.extra?.message ?? f.check_id,
                severity: (f.extra?.severity === 'ERROR' ? 'HIGH' : f.extra?.severity === 'WARNING' ? 'MEDIUM' : 'INFO') as Severity,
                description: f.extra?.message ?? '',
                file: f.path,
                line: f.start?.line,
                code: f.extra?.lines,
            });
        }
    }

    // DAST (ZAP)
    const dast = raw as DASTResults;
    if (dast?.Site?.[0]?.Alerts?.length) {
        for (const a of dast.Site[0].Alerts) {
            const sev = a.Risk === 'Informational' ? 'INFO' : a.Risk.toUpperCase() as Severity;
            for (const inst of (a.Instances ?? [{ Uri: '', Method: 'GET' }])) {
                results.push({
                    id: `${a.Alert}-${inst.Uri}`,
                    title: a.Alert,
                    severity: sev,
                    description: a.Description ?? '',
                    solution: a.Solution,
                    url: inst.Uri,
                    method: inst.Method,
                    param: inst.Param,
                });
            }
        }
    }

    // Container (Trivy)
    const trivy = raw as ContainerResults;
    if (trivy?.Results?.length) {
        for (const r of trivy.Results) {
            for (const v of (r.Vulnerabilities ?? [])) {
                results.push({
                    id: v.VulnerabilityID,
                    title: v.Title ?? v.VulnerabilityID,
                    severity: (v.Severity === 'UNKNOWN' ? 'INFO' : v.Severity) as Severity,
                    description: v.Description ?? '',
                    package: v.PkgName,
                    version: v.InstalledVersion,
                    fixedVersion: v.FixedVersion,
                    cve: v.VulnerabilityID?.startsWith('CVE') ? v.VulnerabilityID : undefined,
                });
            }
        }
    }

    return results;
}

interface ScanResultsViewerProps {
    scan: any;
}

export const ScanResultsViewer: React.FC<ScanResultsViewerProps> = ({ scan }) => {
    const [expandedVuln, setExpandedVuln] = useState<string | null>(null);
    const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

    if (!scan) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }} className="text-secondary">
                <Info size={48} style={{ margin: '0 auto 16px' }} />
                <p>No scan data available</p>
            </div>
        );
    }

    const vulnerabilities = parseScanResults(scan);
    const stats = getSeverityStats(vulnerabilities);
    const groupedVulns = groupBySeverity(vulnerabilities);

    const filteredVulns = selectedSeverity === 'ALL'
        ? vulnerabilities
        : groupedVulns[selectedSeverity] || [];

    const getSeverityIcon = (severity: string) => {
        switch (severity?.toUpperCase()) {
            case 'CRITICAL':
            case 'HIGH':
                return <XCircle size={20} />;
            case 'MEDIUM':
                return <AlertTriangle size={20} />;
            case 'LOW':
            case 'INFO':
                return <Info size={20} />;
            default:
                return <CheckCircle size={20} />;
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Scan Results
                </h2>
                <p className="text-secondary">
                    {scan.scanType} scan completed on {new Date(scan.completedAt || scan.createdAt).toLocaleString()}
                </p>
            </div>

            {/* Summary Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <StatCard
                    label="Total"
                    value={stats.total}
                    severity="TOTAL"
                    active={selectedSeverity === 'ALL'}
                    onClick={() => setSelectedSeverity('ALL')}
                />
                <StatCard
                    label="Critical"
                    value={stats.CRITICAL}
                    severity="CRITICAL"
                    active={selectedSeverity === 'CRITICAL'}
                    onClick={() => setSelectedSeverity('CRITICAL')}
                />
                <StatCard
                    label="High"
                    value={stats.HIGH}
                    severity="HIGH"
                    active={selectedSeverity === 'HIGH'}
                    onClick={() => setSelectedSeverity('HIGH')}
                />
                <StatCard
                    label="Medium"
                    value={stats.MEDIUM}
                    severity="MEDIUM"
                    active={selectedSeverity === 'MEDIUM'}
                    onClick={() => setSelectedSeverity('MEDIUM')}
                />
                <StatCard
                    label="Low"
                    value={stats.LOW}
                    severity="LOW"
                    active={selectedSeverity === 'LOW'}
                    onClick={() => setSelectedSeverity('LOW')}
                />
            </div>

            {/* Vulnerabilities List */}
            {filteredVulns.length === 0 ? (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-light)',
                }}>
                    <CheckCircle size={48} style={{ color: 'var(--color-success)', margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                        No vulnerabilities found
                    </p>
                    <p className="text-secondary">
                        {selectedSeverity === 'ALL'
                            ? 'This scan completed successfully with no issues detected.'
                            : `No ${selectedSeverity.toLowerCase()} severity issues found.`}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredVulns.map((vuln) => (
                        <VulnerabilityCard
                            key={vuln.id}
                            vulnerability={vuln}
                            expanded={expandedVuln === vuln.id}
                            onToggle={() => setExpandedVuln(expandedVuln === vuln.id ? null : vuln.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    label: string;
    value: number;
    severity: string;
    active: boolean;
    onClick: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, severity, active, onClick }) => {
    const color = getSeverityColor(severity);
    const bgTint = getStatTintColor(severity);

    return (
        <div
            onClick={onClick}
            style={{
                padding: '16px',
                borderRadius: '8px',
                border: `2px solid ${active ? color : 'var(--color-border)'}`,
                backgroundColor: active ? bgTint : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
        >
            <div style={{ fontSize: '28px', fontWeight: 'bold', color, marginBottom: '4px' }}>
                {value}
            </div>
            <div style={{ fontSize: '14px' }} className="text-secondary">
                {label}
            </div>
        </div>
    );
};

// Vulnerability Card Component
interface VulnerabilityCardProps {
    vulnerability: UnifiedVulnerability;
    expanded: boolean;
    onToggle: () => void;
}

const VulnerabilityCard: React.FC<VulnerabilityCardProps> = ({ vulnerability, expanded, onToggle }) => {
    const severityColor = getSeverityColor(vulnerability.severity);
    const severityBgColor = getSeverityBgColor(vulnerability.severity);

    return (
        <div style={{
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--color-surface)',
        }}>
            {/* Header */}
            <div
                onClick={onToggle}
                style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: expanded ? 'var(--color-surface-light)' : 'var(--color-surface)',
                    transition: 'background-color 0.2s',
                }}
            >
                {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}

                <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: severityBgColor,
                    color: severityColor,
                    fontSize: '12px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}>
                    {React.createElement(
                        vulnerability.severity === 'CRITICAL' || vulnerability.severity === 'HIGH' ? XCircle :
                            vulnerability.severity === 'MEDIUM' ? AlertTriangle : Info,
                        { size: 14 }
                    )}
                    {vulnerability.severity}
                </div>

                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {vulnerability.title}
                    </div>
                    {vulnerability.file && (
                        <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }} className="text-secondary">
                            <FileText size={14} />
                            {vulnerability.file}
                            {vulnerability.line && `:${vulnerability.line}`}
                        </div>
                    )}
                    {vulnerability.package && (
                        <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }} className="text-secondary">
                            <Package size={14} />
                            {vulnerability.package} {vulnerability.version && `(${vulnerability.version})`}
                        </div>
                    )}
                    {vulnerability.url && (
                        <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }} className="text-secondary">
                            <Globe size={14} />
                            {vulnerability.url}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface-light)' }}>
                    {/* Description */}
                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                            Description
                        </h4>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: '1.6' }}>
                            {vulnerability.description}
                        </p>
                    </div>

                    {/* Code Snippet */}
                    {vulnerability.code && (
                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Code size={16} />
                                Code
                            </h4>
                            <pre style={{
                                backgroundColor: 'var(--color-bg-code)',
                                color: 'var(--color-text-on-code)',
                                padding: '12px',
                                borderRadius: '4px',
                                fontSize: '13px',
                                overflow: 'auto',
                                fontFamily: 'monospace',
                            }}>
                                {vulnerability.code}
                            </pre>
                        </div>
                    )}

                    {/* Solution */}
                    {vulnerability.solution && (
                        <div style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                                Remediation
                            </h4>
                            <p style={{
                                fontSize: '14px',
                                color: 'var(--color-success)',
                                backgroundColor: 'var(--color-bg-success)',
                                padding: '12px',
                                borderRadius: '4px',
                                lineHeight: '1.6',
                            }}>
                                {vulnerability.solution}
                            </p>
                        </div>
                    )}

                    {/* Metadata */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }} className="text-secondary">
                        {vulnerability.cve && (
                            <div>
                                <strong>CVE:</strong> {vulnerability.cve}
                            </div>
                        )}
                        {vulnerability.cwe && (
                            <div>
                                <strong>CWE:</strong> {vulnerability.cwe}
                            </div>
                        )}
                        {vulnerability.fixedVersion && (
                            <div>
                                <strong>Fixed in:</strong> {vulnerability.fixedVersion}
                            </div>
                        )}
                        {vulnerability.method && (
                            <div>
                                <strong>Method:</strong> {vulnerability.method}
                            </div>
                        )}
                        {vulnerability.param && (
                            <div>
                                <strong>Parameter:</strong> {vulnerability.param}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScanResultsViewer;

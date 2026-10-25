// Unified Vulnerability for Display
export interface UnifiedVulnerability {
    id: string;
    title: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    description: string;
    file?: string;
    line?: number;
    solution?: string;
    cwe?: string;
    cve?: string;
    package?: string;
    version?: string;
    fixedVersion?: string;
    url?: string;
    method?: string;
    param?: string;
    code?: string;
}

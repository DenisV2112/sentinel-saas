import { useState } from 'react';
import { getScans, startScan, getScan } from '../api/scans.api';

export interface ScanRequest {
    projectId: string;
    scanType?: string;
    targetRepo?: string;
    targetUrl?: string;
}

export interface Scan {
    id: string;
    projectId: string;
    tenantId: string;
    userId: string;
    status: string;
    scanType: string;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export const useScans = () => {
    const [scans, setScans] = useState<Scan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchScans = async (tenantId: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getScans(tenantId);
            setScans(response.data.content || response.data);
        } catch (err: any) {
            console.error('Failed to fetch scans:', err);
            setError(err.response?.data?.message || 'Failed to fetch scans');
        } finally {
            setLoading(false);
        }
    };

    const startScanFn = async (request: ScanRequest, tenantId: string) => {
        setLoading(true);
        setError(null);
        try {
            const userId = localStorage.getItem('userId');

            if (!userId) {
                alert('DEBUG ERROR: User ID not found in localStorage. Please Logout and Login again.');
                console.error('User ID missing');
            }

            // Map frontend request to backend DTO
            const backendRequest = {
                type: request.scanType,
                targetUrl: request.targetUrl,
                targetRepo: request.targetRepo,
                projectId: request.projectId,
            };

            const response = await startScan(backendRequest, tenantId, userId || '');
            return response.data;
        } catch (err: any) {
            console.error('Failed to start scan:', err);
            setError(err.response?.data?.message || 'Failed to start scan');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const getScanById = async (scanId: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await getScan(scanId);
            return response.data;
        } catch (err: any) {
            console.error('Failed to fetch scan:', err);
            setError(err.response?.data?.message || 'Failed to fetch scan');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        scans,
        loading,
        error,
        fetchScans,
        startScan: startScanFn,
        getScan: getScanById,
    };
};

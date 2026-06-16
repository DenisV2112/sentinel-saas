package com.sentinel.backend_for_frontend_service.service.impl;

import com.sentinel.backend_for_frontend_service.client.OrchestratorClient;
import com.sentinel.backend_for_frontend_service.client.ResultsAggregatorClient;
import com.sentinel.backend_for_frontend_service.util.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * TDD: Tests for ScanServiceImpl field mapping in listScans().
 * REQ-NEW-5: BFF maps orchestrator's targetRepo → branch, id → scanId for frontend.
 */
@ExtendWith(MockitoExtension.class)
class ScanServiceImplTest {

    @Mock
    private OrchestratorClient orchestratorClient;

    @Mock
    private ResultsAggregatorClient resultsAggregatorClient;

    @Mock
    private JwtUtils jwtUtils;

    private ScanServiceImpl scanService;

    @BeforeEach
    void setUp() {
        scanService = new ScanServiceImpl(orchestratorClient, resultsAggregatorClient, jwtUtils);
    }

    @Test
    void shouldMapTargetRepoToBranchAndIdToScanId() {
        // Given: orchestrator returns scans with "targetRepo" and "id" fields
        UUID scanId = UUID.randomUUID();
        Map<String, Object> orchestratorScan = Map.of(
                "id", scanId.toString(),
                "projectId", UUID.randomUUID().toString(),
                "type", "SAST",
                "status", "COMPLETED",
                "targetRepo", "main",
                "targetUrl", "https://github.com/example/repo",
                "createdAt", "2026-01-15T10:30:00"
        );

        Page<Map<String, Object>> orchestratorPage = new PageImpl<>(
                List.of(orchestratorScan), PageRequest.of(0, 10), 1
        );

        when(orchestratorClient.listScans(
                any(Pageable.class), eq(null), eq(null), eq(null), eq(null),
                eq("Bearer token"), eq("tenant-123")
        )).thenReturn(orchestratorPage);

        // When: BFF service calls listScans
        Page<Map<String, Object>> result = scanService.listScans(
                PageRequest.of(0, 10), null, null, null, null,
                "Bearer token", "tenant-123"
        );

        // Then: targetRepo is mapped to branch, id is mapped to scanId
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        Map<String, Object> mapped = result.getContent().get(0);

        assertEquals(scanId.toString(), mapped.get("scanId"),
                "id should be mapped to scanId");
        assertEquals("main", mapped.get("branch"),
                "targetRepo should be mapped to branch");
        assertEquals("SAST", mapped.get("type"),
                "other fields should pass through unchanged");
        assertEquals("COMPLETED", mapped.get("status"),
                "other fields should pass through unchanged");
    }

    @Test
    void shouldNotContainOriginalTargetRepoAndIdKeys() {
        // Given: orchestrator returns a scan with targetRepo and id
        Map<String, Object> orchestratorScan = Map.of(
                "id", UUID.randomUUID().toString(),
                "targetRepo", "develop",
                "status", "RUNNING"
        );

        Page<Map<String, Object>> orchestratorPage = new PageImpl<>(
                List.of(orchestratorScan), PageRequest.of(0, 10), 1
        );

        when(orchestratorClient.listScans(
                any(Pageable.class), eq(null), eq(null), eq(null), eq(null),
                eq("Bearer token"), eq("tenant-123")
        )).thenReturn(orchestratorPage);

        // When
        Page<Map<String, Object>> result = scanService.listScans(
                PageRequest.of(0, 10), null, null, null, null,
                "Bearer token", "tenant-123"
        );

        // Then: the original keys should be replaced, not duplicated
        Map<String, Object> mapped = result.getContent().get(0);
        assertFalse(mapped.containsKey("targetRepo"),
                "original targetRepo key should be removed");
        assertFalse(mapped.containsKey("id"),
                "original id key should be removed");
        assertTrue(mapped.containsKey("branch"),
                "mapped branch key should exist");
        assertTrue(mapped.containsKey("scanId"),
                "mapped scanId key should exist");
    }

    @Test
    void shouldHandleEmptyResultGracefully() {
        // Given: orchestrator returns empty page
        Page<Map<String, Object>> emptyPage = new PageImpl<>(
                List.of(), PageRequest.of(0, 10), 0
        );

        when(orchestratorClient.listScans(
                any(Pageable.class), eq(null), eq(null), eq(null), eq(null),
                eq("Bearer token"), eq("tenant-123")
        )).thenReturn(emptyPage);

        // When
        Page<Map<String, Object>> result = scanService.listScans(
                PageRequest.of(0, 10), null, null, null, null,
                "Bearer token", "tenant-123"
        );

        // Then: should not crash, should return empty page
        assertNotNull(result);
        assertEquals(0, result.getTotalElements());
        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void shouldPreserveOtherFieldsUnchanged() {
        // Given: orchestrator scan with many fields
        Map<String, Object> orchestratorScan = Map.of(
                "id", UUID.randomUUID().toString(),
                "projectId", UUID.randomUUID().toString(),
                "tenantId", UUID.randomUUID().toString(),
                "type", "DAST",
                "status", "FAILED",
                "targetRepo", "feature/x",
                "targetUrl", "https://example.com",
                "createdAt", "2026-06-01T12:00:00",
                "finishedAt", "2026-06-01T12:05:00",
                "failureReason", "timeout"
        );

        Page<Map<String, Object>> orchestratorPage = new PageImpl<>(
                List.of(orchestratorScan), PageRequest.of(0, 10), 1
        );

        when(orchestratorClient.listScans(
                any(Pageable.class), eq(null), eq(null), eq(null), eq(null),
                eq("Bearer token"), eq("tenant-123")
        )).thenReturn(orchestratorPage);

        // When
        Page<Map<String, Object>> result = scanService.listScans(
                PageRequest.of(0, 10), null, null, null, null,
                "Bearer token", "tenant-123"
        );

        // Then: all fields except targetRepo/id pass through unchanged
        Map<String, Object> mapped = result.getContent().get(0);
        assertEquals("DAST", mapped.get("type"));
        assertEquals("FAILED", mapped.get("status"));
        assertEquals("https://example.com", mapped.get("targetUrl"));
        assertEquals("2026-06-01T12:00:00", mapped.get("createdAt"));
        assertEquals("2026-06-01T12:05:00", mapped.get("finishedAt"));
        assertEquals("timeout", mapped.get("failureReason"));
    }
}

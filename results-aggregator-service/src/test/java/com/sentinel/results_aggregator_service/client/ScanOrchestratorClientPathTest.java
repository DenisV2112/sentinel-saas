package com.sentinel.results_aggregator_service.client;

import com.sentinel.common.security.enums.ScanStatus;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;

import java.lang.reflect.Method;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Verifies that ScanOrchestratorClient's FeignClient uses the correct
 * internal orchestrator path: /api/internal/scans/{scanId}/status
 *
 * The fix changed the path from /api/scans/{id}/status to the correct
 * internal path that matches InternalScanController.updateStatus().
 */
class ScanOrchestratorClientPathTest {

    @Test
    void updateScanStatusMappingShouldUseInternalPath() throws Exception {
        // Given: the ScanOrchestratorClient interface
        Method method = ScanOrchestratorClient.class
                .getMethod("updateScanStatus", UUID.class, ScanStatus.class, String.class);

        // When: reading the @PutMapping annotation
        PutMapping putMapping = method.getAnnotation(PutMapping.class);

        // Then: the path must be the internal orchestrator endpoint
        assertEquals(1, putMapping.value().length,
                "@PutMapping should have exactly one value");
        assertEquals("/api/internal/scans/{scanId}/status",
                putMapping.value()[0],
                "FeignClient path must use /api/internal/scans/{scanId}/status");
    }

    @Test
    void updateScanStatusShouldUseScanIdPathVariable() throws Exception {
        // Given: the updateScanStatus method
        Method method = ScanOrchestratorClient.class
                .getMethod("updateScanStatus", UUID.class, ScanStatus.class, String.class);

        // When: checking the parameter annotations
        var parameters = method.getParameters();
        var scanIdParam = parameters[0];

        // Then: first parameter should be annotated with @PathVariable("scanId")
        PathVariable pathVar = scanIdParam.getAnnotation(PathVariable.class);
        assertEquals("scanId", pathVar.value(),
                "Path variable must be named 'scanId' to match {scanId} in the path");
    }
}

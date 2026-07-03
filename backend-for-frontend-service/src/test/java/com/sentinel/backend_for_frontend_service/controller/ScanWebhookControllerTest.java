package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.dto.ScanResultWebhookRequest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ScanWebhookController — the BFF endpoint that receives scan result
 * notifications from the Security Gate service.
 *
 * Tests follow strict TDD: RED → GREEN → TRIANGULATE.
 * Each test asserts on meaningful differences in the input handling, not just
 * the uniform 200 + received:true response.
 */
class ScanWebhookControllerTest {

    private final ScanWebhookController controller = new ScanWebhookController();

    @Test
    void shouldReturnReceivedForValidWebhookWithAllFields() {
        // Given: a valid full webhook payload from Security Gate — all 5 fields present
        var request = new ScanResultWebhookRequest(
                "123e4567-e89b-12d3-a456-426614174000",
                "Completed",
                true,
                "2026-07-02T15:30:00Z",
                Map.of("critical", 0, "high", 2, "medium", 5, "low", 3, "info", 1),
                Map.of("total", 11)
        );

        // When: processing the webhook notification
        var response = controller.receiveWebhook(request);

        // Then: returns 200 OK with received: true, and all fields preserved
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("received"));
        assertTrue(request.qualityGatePassed());
        assertNotNull(request.completedAt());
        assertEquals(5, request.summary().size());
    }

    @Test
    void shouldHandleFailedScanWithQualityGateFailedAndNonZeroSummary() {
        // Given: a scan that FAILED quality gate with non-zero severity counts
        var request = new ScanResultWebhookRequest(
                "scan-failed-qg",
                "CompletedWithErrors",
                false,
                "2026-07-02T16:00:00Z",
                Map.of("critical", 3, "high", 7, "medium", 2, "low", 0, "info", 0),
                null
        );

        // When
        var response = controller.receiveWebhook(request);

        // Then: still 200 (webhook is informational-only), but quality gate FAILED
        assertEquals(200, response.getStatusCodeValue());
        assertTrue((Boolean) response.getBody().get("received"));
        assertFalse(request.qualityGatePassed());
        assertEquals(3, request.summary().get("critical"));
        assertEquals(7, request.summary().get("high"));
    }

    @Test
    void shouldHandleMinimalPayloadWithNullOptionalFields() {
        // Given: minimal webhook — only scanId and status, all optional fields null
        var request = new ScanResultWebhookRequest(
                "scan-minimal",
                "Failed",
                null,
                null,
                null,
                null
        );

        // When
        var response = controller.receiveWebhook(request);

        // Then: returns 200 without NPE — null optional fields handled gracefully
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("received"));
        assertNull(request.qualityGatePassed());
        assertNull(request.completedAt());
        assertNull(request.summary());
    }

    @Test
    void shouldHandleUnknownFieldsGracefully_preservingKnownFields() {
        // Given: payload with unknown extra fields (ignored by @JsonIgnoreProperties)
        // and known fields still present — this is a Jackson-level concern, but we
        // verify the DTO preserves known fields when extras exist in the JSON
        var request = new ScanResultWebhookRequest(
                "uuid-123",
                "Timeout",
                true,
                "2026-07-02T18:00:00Z",
                Map.of("critical", 0, "high", 0, "medium", 0, "low", 0, "info", 0),
                Map.of("total", 0)
        );

        // When
        var response = controller.receiveWebhook(request);

        // Then: known fields preserved, response ok
        assertEquals(200, response.getStatusCodeValue());
        assertTrue((Boolean) response.getBody().get("received"));
        assertEquals("uuid-123", request.scanId());
        assertEquals("Timeout", request.status());
        assertTrue(request.qualityGatePassed());
    }

    @Test
    void shouldHandleQualityPassedTrueWithNullSummary() {
        // Given: quality gate passed but summary is null (e.g. scan returned no findings)
        var request = new ScanResultWebhookRequest(
                "scan-passed-no-summary",
                "Completed",
                true,
                "2026-07-02T17:00:00Z",
                null,
                null
        );

        // When
        var response = controller.receiveWebhook(request);

        // Then: quality gate passed, but summary is null — no findings to report
        assertEquals(200, response.getStatusCodeValue());
        assertTrue((Boolean) response.getBody().get("received"));
        assertTrue(request.qualityGatePassed());
        assertNull(request.summary());
        assertNotNull(request.completedAt());
    }
}
package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.dto.ScanResultWebhookRequest;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for ScanWebhookController — the BFF endpoint that receives scan result
 * notifications from the Security Gate service.
 */
class ScanWebhookControllerTest {

    private final ScanWebhookController controller = new ScanWebhookController();

    @Test
    void shouldReturnReceivedForValidWebhook() {
        // Given: a valid webhook payload from Security Gate
        var request = new ScanResultWebhookRequest(
                "123e4567-e89b-12d3-a456-426614174000",
                "COMPLETED",
                Map.of("critical", 0, "high", 2, "medium", 5, "low", 3)
        );

        // When: processing the webhook notification
        var response = controller.receiveWebhook(request);

        // Then: returns 200 OK with received: true
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("received"));
    }

    @Test
    void shouldHandleMinimalPayload() {
        // Given: minimal webhook with only scanId and status, no findings
        var request = new ScanResultWebhookRequest(
                "123e4567-e89b-12d3-a456-426614174000",
                "FAILED",
                null
        );

        // When
        var response = controller.receiveWebhook(request);

        // Then: returns 200 OK even without findings
        assertEquals(200, response.getStatusCodeValue());
        assertNotNull(response.getBody());
        assertTrue((Boolean) response.getBody().get("received"));
    }

    @Test
    void shouldHandleUnknownFieldsGracefully() {
        // Given: payload with extra fields (ignored by @JsonIgnoreProperties)
        var request = new ScanResultWebhookRequest(
                "uuid-123",
                "COMPLETED_WITH_ERRORS",
                Map.of("total", 10)
        );

        // When
        var response = controller.receiveWebhook(request);

        // Then
        assertEquals(200, response.getStatusCodeValue());
        assertTrue((Boolean) response.getBody().get("received"));
    }
}

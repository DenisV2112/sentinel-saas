package com.sentinel.backend_for_frontend_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

/**
 * DTO for scan result webhook notifications received from the Security Gate service.
 * Contains the scanId, status, and optional findings summary from the completed scan.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ScanResultWebhookRequest(
        String scanId,
        String status,
        Map<String, Object> findings
) {
}

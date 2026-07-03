package com.sentinel.backend_for_frontend_service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

/**
 * DTO for scan result webhook notifications received from the Security Gate service.
 * Captures all 5 fields sent by Security Gate's ScanResultListener:
 * scanId, status, qualityGatePassed, completedAt, and summary (SeveritySummary).
 * The findings field is kept for backward compatibility with future payloads.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ScanResultWebhookRequest(
        String scanId,
        String status,
        Boolean qualityGatePassed,
        String completedAt,
        Map<String, Object> summary,
        Map<String, Object> findings
) {
}

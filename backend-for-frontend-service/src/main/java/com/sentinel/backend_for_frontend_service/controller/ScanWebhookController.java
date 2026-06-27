package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.dto.ScanResultWebhookRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller for receiving scan result webhook notifications from the Security Gate service.
 * This is an informational endpoint — the authoritative status update comes from
 * Security Gate directly to the orchestrator via HTTP callback.
 * <p>
 * Public endpoint (no auth) — called by Security Gate service internally.
 */
@Slf4j
@RestController
@RequestMapping("/api/bff/scans/webhook")
@RequiredArgsConstructor
public class ScanWebhookController {

    /**
     * Receives scan result notifications from the Security Gate service.
     * Logs the incoming webhook for debugging and returns confirmation.
     *
     * @param request the webhook payload containing scanId, status, and findings
     * @return 200 OK with confirmation
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> receiveWebhook(
            @RequestBody ScanResultWebhookRequest request) {
        log.info("📡 BFF: Scan result webhook received — scanId: {}, status: {}, findings keys: {}",
                request.scanId(),
                request.status(),
                request.findings() != null ? request.findings().keySet() : "null");

        return ResponseEntity.ok(Map.of("received", true));
    }
}

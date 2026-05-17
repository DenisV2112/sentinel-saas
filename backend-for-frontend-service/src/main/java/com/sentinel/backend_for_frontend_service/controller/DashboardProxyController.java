package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.client.ResultsAggregatorClient;
import com.sentinel.backend_for_frontend_service.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardProxyController {

    private final ResultsAggregatorClient resultsAggregatorClient;
    private final JwtUtils jwtUtils;

    @GetMapping("/top-risk-projects")
    public ResponseEntity<?> getTopRiskProjects(
            @RequestHeader(value = "Authorization", required = false) String token) {
        log.info("📊 BFF: Getting top risk projects...");
        try {
            String tenantId = jwtUtils.extractTenantId(token);
            if (tenantId == null) {
                log.warn("No tenantId in token, returning empty list");
                return ResponseEntity.ok(List.of());
            }
            return ResponseEntity.ok(resultsAggregatorClient.getTopRiskProjects(token, tenantId, 5));
        } catch (Exception e) {
            log.error("Failed to fetch top risk projects: {}", e.getMessage());
            return ResponseEntity.ok(List.of());
        }
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getDashboardSummary(
            @RequestHeader(value = "Authorization", required = false) String token) {
        log.info("📊 BFF: Getting dashboard summary...");
        return ResponseEntity.ok(Map.of(
                "totalProjects", 0,
                "totalScans", 0,
                "criticalVulnerabilities", 0,
                "highVulnerabilities", 0,
                "mediumVulnerabilities", 0,
                "lowVulnerabilities", 0));
    }
}

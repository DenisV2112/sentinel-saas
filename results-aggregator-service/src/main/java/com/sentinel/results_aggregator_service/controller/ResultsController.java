package com.sentinel.results_aggregator_service.controller;

import com.sentinel.results_aggregator_service.domain.ScanResult;
import com.sentinel.results_aggregator_service.service.ResultsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/results")
@RequiredArgsConstructor
public class ResultsController {

    private final ResultsService resultsService;

    @GetMapping("/{scanId}")
    public ResponseEntity<ScanResult> getScanResult(@PathVariable UUID scanId) {
        return ResponseEntity.ok(resultsService.getResult(scanId));
    }

    @GetMapping("/analytics/vulnerabilities")
    public ResponseEntity<Map<String, Object>> getVulnerabilityAnalytics(
            @RequestParam(required = false) String projectId,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader("X-Tenant-Id") UUID tenantId) {
        return ResponseEntity.ok(resultsService.getVulnerabilityAnalytics(tenantId, projectId, days));
    }

    @GetMapping("/analytics/code-quality")
    public ResponseEntity<Map<String, Object>> getCodeQualityAnalytics(
            @RequestParam(required = false) String projectId,
            @RequestParam(defaultValue = "30") int days,
            @RequestHeader("X-Tenant-Id") UUID tenantId) {
        return ResponseEntity.ok(resultsService.getCodeQualityAnalytics(tenantId, projectId, days));
    }

    @GetMapping("/analytics/compliance")
    public ResponseEntity<Map<String, Object>> getComplianceAnalytics(
            @RequestParam(required = false) String projectId,
            @RequestParam(defaultValue = "GDPR") String standards,
            @RequestHeader("X-Tenant-Id") UUID tenantId) {
        return ResponseEntity.ok(resultsService.getComplianceAnalytics(tenantId, projectId, standards));
    }

    @GetMapping("/analytics/top-risk-projects")
    public ResponseEntity<List<Map<String, Object>>> getTopRiskProjects(
            @RequestHeader("X-Tenant-Id") UUID tenantId,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(resultsService.getTopRiskProjects(tenantId, limit));
    }
}

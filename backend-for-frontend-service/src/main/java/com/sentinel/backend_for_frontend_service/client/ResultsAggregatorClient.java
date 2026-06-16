package com.sentinel.backend_for_frontend_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "results-aggregator-client", url = "${app.services.results-aggregator-url:http://results-aggregator-service:8087}")
public interface ResultsAggregatorClient {

        @GetMapping("/api/results/{scanId}")
        Map<String, Object> getScanResults(
                        @PathVariable String scanId,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId);

        @GetMapping("/api/results/{scanId}/export")
        Map<String, Object> exportScanResults(
                        @PathVariable String scanId,
                        @RequestParam String format,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId);

        @GetMapping("/api/results/analytics/vulnerabilities")
        Map<String, Object> getVulnerabilityAnalytics(
                        @RequestParam(required = false, value = "projectId") String projectId,
                        @RequestParam(value = "days") int days,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId);

        @GetMapping("/api/results/analytics/code-quality")
        Map<String, Object> getCodeQualityAnalytics(
                        @RequestParam(required = false, value = "projectId") String projectId,
                        @RequestParam(value = "days") int days,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId);

        @GetMapping("/api/results/analytics/compliance")
        Map<String, Object> getComplianceAnalytics(
                        @RequestParam(required = false, value = "projectId") String projectId,
                        @RequestParam(value = "standards") String standards,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId);

        @GetMapping("/api/results/analytics/top-risk-projects")
        List<Map<String, Object>> getTopRiskProjects(
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId,
                        @RequestParam(defaultValue = "5") int limit);
}

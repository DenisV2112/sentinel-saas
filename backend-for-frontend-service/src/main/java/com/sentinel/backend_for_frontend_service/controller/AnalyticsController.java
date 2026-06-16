package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.client.ResultsAggregatorClient;
import com.sentinel.backend_for_frontend_service.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/bff/analytics")
@Tag(name = "Analytics", description = "Analytics and insights endpoints")
@SecurityRequirement(name = "bearerAuth")
@RequiredArgsConstructor
public class AnalyticsController {

        private final ResultsAggregatorClient resultsClient;
        private final JwtUtils jwtUtils;

        @GetMapping("/vulnerabilities")
        @Operation(summary = "Get vulnerability analytics")
        public ResponseEntity<Map<String, Object>> getVulnerabilityAnalytics(
                        @RequestParam(required = false) String projectId,
                        @RequestParam(defaultValue = "30") int days,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
                log.info("🛡️ BFF: Get vulnerability analytics - Days: {}, TenantId: {}", days, tenantId);
                try {
                        String resolvedTenant = resolveTenantId(token, tenantId);
                        return ResponseEntity.ok(resultsClient.getVulnerabilityAnalytics(projectId, days, token, resolvedTenant));
                } catch (Exception e) {
                        log.warn("⚠️ Results aggregator unavailable for vulnerability analytics: {}", e.getMessage());
                        return ResponseEntity.ok(Map.of("data", java.util.List.of(), "message", "Analytics temporarily unavailable"));
                }
        }

        @GetMapping("/code-quality")
        @Operation(summary = "Get code quality analytics")
        public ResponseEntity<Map<String, Object>> getCodeQualityAnalytics(
                        @RequestParam(required = false) String projectId,
                        @RequestParam(defaultValue = "30") int days,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
                log.info("📈 BFF: Get code quality analytics");
                String resolvedTenant = resolveTenantId(token, tenantId);
                return ResponseEntity.ok(resultsClient.getCodeQualityAnalytics(projectId, days, token, resolvedTenant));
        }

        @GetMapping("/compliance")
        @Operation(summary = "Get compliance analytics")
        public ResponseEntity<Map<String, Object>> getComplianceAnalytics(
                        @RequestParam(required = false) String projectId,
                        @RequestParam(defaultValue = "GDPR,PCI-DSS,HIPAA") String standards,
                        @RequestHeader("Authorization") String token,
                        @RequestHeader(value = "X-Tenant-Id", required = false) String tenantId) {
                log.info("✅ BFF: Get compliance analytics");
                String resolvedTenant = resolveTenantId(token, tenantId);
                return ResponseEntity.ok(resultsClient.getComplianceAnalytics(projectId, standards, token, resolvedTenant));
        }

        private String resolveTenantId(String token, String headerTenantId) {
                if (headerTenantId != null && !headerTenantId.isEmpty()) {
                        return headerTenantId;
                }
                String tokenTenant = jwtUtils.extractTenantId(token);
                return tokenTenant != null ? tokenTenant : "";
        }
}

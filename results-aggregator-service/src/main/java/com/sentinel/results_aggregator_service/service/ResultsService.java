package com.sentinel.results_aggregator_service.service;

import com.sentinel.results_aggregator_service.client.ScanOrchestratorClient;
import com.sentinel.results_aggregator_service.domain.ScanResult;
import com.sentinel.results_aggregator_service.domain.Vulnerability;
import com.sentinel.results_aggregator_service.domain.enums.ScanStatus;
import com.sentinel.results_aggregator_service.dto.ScanResultEventDTO;
import com.sentinel.results_aggregator_service.repository.ScanResultRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResultsService {

    private final ScanResultRepository repository;
    private final ScanOrchestratorClient orchestratorClient;

    public void processScanResult(ScanResultEventDTO event) {
        log.info("Processing scan result for scanId: {}", event.getScanId());

        // 1. Save detailed result in Mongo
        ScanResult result = ScanResult.builder()
                .scanId(event.getScanId())
                .tenantId(event.getTenantId())
                .type(event.getType())
                .status(event.getStatus())
                .findings(event.getFindings())
                .completedAt(event.getCompletedAt() != null ? event.getCompletedAt() : LocalDateTime.now())
                .detectedAt(LocalDateTime.now())
                .criticalCount((int) event.getFindings().stream().filter(v -> "HIGH".equalsIgnoreCase(v.getSeverity()))
                        .count())
                .highCount((int) event.getFindings().stream().filter(v -> "MEDIUM".equalsIgnoreCase(v.getSeverity()))
                        .count())
                .mediumCount(
                        (int) event.getFindings().stream().filter(v -> "LOW".equalsIgnoreCase(v.getSeverity())).count())
                .lowCount(0)
                .build();

        repository.save(result);
        log.info("Saved scan result to MongoDB");

        // 2. Update Orchestrator status
        try {
            orchestratorClient.updateScanStatus(event.getScanId(), event.getStatus(), null);
            log.info("Updated Orchestrator status for scanId: {}", event.getScanId());
        } catch (Exception e) {
            log.error("Failed to update Orchestrator status", e);
        }
    }

    public ScanResult getResult(java.util.UUID scanId) {
        return repository.findByScanId(scanId)
                .orElseThrow(() -> new RuntimeException("Result not found"));
    }

    public Map<String, Object> getVulnerabilityAnalytics(UUID tenantId, String projectId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<ScanResult> results = repository.findByTenantIdAndDetectedAtAfterOrderByDetectedAtAsc(tenantId, since);

        if (results.isEmpty()) {
            return Map.of(
                    "projectId", projectId != null ? projectId : "all",
                    "period", "Last " + days + " days",
                    "totalVulnerabilities", 0,
                    "severityBreakdown", Map.of("CRITICAL", 0, "HIGH", 0, "MEDIUM", 0, "LOW", 0),
                    "trend", List.of());
        }

        // Aggregate severity counts
        int totalCritical = results.stream().mapToInt(ScanResult::getCriticalCount).sum();
        int totalHigh = results.stream().mapToInt(ScanResult::getHighCount).sum();
        int totalMedium = results.stream().mapToInt(ScanResult::getMediumCount).sum();
        int totalLow = results.stream().mapToInt(ScanResult::getLowCount).sum();
        int totalFindings = totalCritical + totalHigh + totalMedium + totalLow;

        // Build daily trend: group by date and sum total findings per day
        Map<LocalDate, Integer> dailyTotals = results.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getDetectedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.summingInt(r -> r.getCriticalCount() + r.getHighCount() + r.getMediumCount()
                                + r.getLowCount())));

        List<Integer> trend = new ArrayList<>(dailyTotals.values());

        return Map.of(
                "projectId", projectId != null ? projectId : "all",
                "period", "Last " + days + " days",
                "totalVulnerabilities", totalFindings,
                "severityBreakdown", Map.of(
                        "CRITICAL", totalCritical,
                        "HIGH", totalHigh,
                        "MEDIUM", totalMedium,
                        "LOW", totalLow),
                "trend", trend);
    }

    public Map<String, Object> getCodeQualityAnalytics(UUID tenantId, String projectId, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<ScanResult> results = repository.findByTenantIdAndDetectedAtAfterOrderByDetectedAtAsc(tenantId, since);

        long totalScans = results.size();
        if (totalScans == 0) {
            return Map.of(
                    "projectId", projectId != null ? projectId : "all",
                    "averageGrade", "N/A",
                    "maintainabilityIndex", 0,
                    "issues", Map.of("bugs", 0, "codeSmells", 0, "duplications", 0),
                    "coverage", 0.0);
        }

        int totalFindings = results.stream()
                .mapToInt(r -> r.getCriticalCount() + r.getHighCount() + r.getMediumCount() + r.getLowCount())
                .sum();

        return Map.of(
                "projectId", projectId != null ? projectId : "all",
                "averageGrade", totalFindings == 0 ? "A" : totalFindings < 10 ? "B" : "C",
                "maintainabilityIndex", Math.max(0, 100 - totalFindings),
                "issues", Map.of(
                        "bugs", results.stream().mapToInt(ScanResult::getCriticalCount).sum(),
                        "codeSmells", results.stream().mapToInt(ScanResult::getHighCount).sum(),
                        "duplications", results.stream().mapToInt(ScanResult::getMediumCount).sum()),
                "coverage", totalScans > 0 ? 80.0 : 0.0);
    }

    public Map<String, Object> getComplianceAnalytics(UUID tenantId, String projectId, String standards) {
        List<ScanResult> allResults = repository.findByTenantIdAndDetectedAtAfterOrderByDetectedAtAsc(tenantId,
                LocalDateTime.now().minusYears(1));

        int totalFindings = allResults.stream()
                .mapToInt(r -> r.getCriticalCount() + r.getHighCount() + r.getMediumCount() + r.getLowCount())
                .sum();

        boolean compliant = totalFindings < 20;

        return Map.of(
                "projectId", projectId != null ? projectId : "all",
                "standards", standards,
                "score", compliant ? 92 : 65,
                "passingRequirements", compliant ? 45 : 32,
                "failingRequirements", compliant ? 4 : 13,
                "status", compliant ? "COMPLIANT" : "NON_COMPLIANT");
    }

    /**
     * Get top risk projects aggregated from scan results.
     * Groups by scan type and sums critical + high findings.
     */
    public List<Map<String, Object>> getTopRiskProjects(UUID tenantId, int limit) {
        LocalDateTime since = LocalDateTime.now().minusDays(90);
        List<ScanResult> results = repository.findByTenantIdAndDetectedAtAfterOrderByDetectedAtAsc(tenantId, since);

        if (results.isEmpty()) {
            return List.of();
        }

        // Group by scan type and compute risk
        return results.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getType() != null ? r.getType().name() : "Unknown"))
                .entrySet().stream()
                .map(entry -> {
                    List<ScanResult> typeResults = entry.getValue();
                    int critical = typeResults.stream().mapToInt(ScanResult::getCriticalCount).sum();
                    int high = typeResults.stream().mapToInt(ScanResult::getHighCount).sum();
                    return (Map<String, Object>) new HashMap<String, Object>(Map.of(
                            "projectName", entry.getKey(),
                            "criticalFindings", critical,
                            "highFindings", high));
                })
                .sorted((a, b) -> {
                    int riskA = (int) a.get("criticalFindings") + (int) a.get("highFindings");
                    int riskB = (int) b.get("criticalFindings") + (int) b.get("highFindings");
                    return Integer.compare(riskB, riskA); // descending
                })
                .limit(limit > 0 ? limit : 5)
                .collect(Collectors.toList());
    }
}

package com.sentinel.scaner_orchestrator_service.service;

import com.sentinel.scaner_orchestrator_service.client.TenantClient;
import com.sentinel.scaner_orchestrator_service.domain.ScanJob;
import com.sentinel.scaner_orchestrator_service.domain.enums.ScanStatus;
import com.sentinel.scaner_orchestrator_service.dto.message.ScanEventDTO;
import com.sentinel.scaner_orchestrator_service.dto.request.ScanRequestDTO;
import com.sentinel.scaner_orchestrator_service.dto.response.ScanResponseDTO;
import com.sentinel.scaner_orchestrator_service.messaging.ScanPublisher;
import com.sentinel.scaner_orchestrator_service.repository.ScanJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {

    private final ScanJobRepository scanJobRepository;
    private final ScanPublisher scanPublisher;
    private final TenantClient tenantClient;

    @Transactional
    public ScanResponseDTO createScan(ScanRequestDTO request, UUID tenantId, UUID userId) {
        log.info("Creating scan request for tenant: {}", tenantId);

        ScanJob job = ScanJob.builder()
                .tenantId(tenantId)
                .projectId(request.getProjectId())
                .userId(userId)
                .type(request.getType())
                .status(ScanStatus.PENDING)
                .targetUrl(request.getTargetUrl())
                .targetRepo(request.getTargetRepo())
                .createdAt(LocalDateTime.now())
                .build();

        job = scanJobRepository.save(job);

        ScanEventDTO event = ScanEventDTO.builder()
                .scanId(job.getId())
                .requestedService(job.getType())
                .tenantId(tenantId)
                .targetUrl(job.getTargetUrl())
                .targetRepo(job.getTargetRepo())
                .clientGitToken(request.getGitToken())
                .build();

        scanPublisher.publishScanRequested(event);

        return mapToDTO(job);
    }

    /**
     * Auto-progress PENDING scans to RUNNING and RUNNING to COMPLETED.
     * Runs every 15 seconds. MVP approach — in production, external scanners update status via RabbitMQ.
     */
    @Scheduled(fixedRate = 15000)
    @Transactional
    public void autoProgressScans() {
        List<ScanJob> pendingScans = scanJobRepository.findByStatus(ScanStatus.PENDING);
        for (ScanJob job : pendingScans) {
            job.setStatus(ScanStatus.RUNNING);
            job.setStartedAt(LocalDateTime.now());
            scanJobRepository.save(job);
            log.info("Auto-progressed scan {} to RUNNING", job.getId());
        }

        List<ScanJob> runningScans = scanJobRepository.findByStatus(ScanStatus.RUNNING);
        for (ScanJob job : runningScans) {
            // Auto-complete scans that have been running for 30+ seconds
            if (job.getStartedAt() != null &&
                    job.getStartedAt().plusSeconds(30).isBefore(LocalDateTime.now())) {
                job.setStatus(ScanStatus.COMPLETED);
                job.setFinishedAt(LocalDateTime.now());
                scanJobRepository.save(job);
                log.info("Auto-completed scan {}", job.getId());
            }
        }
    }

    public Page<ScanResponseDTO> getScans(UUID tenantId, Pageable pageable,
                                          String status, String type,
                                          String startDate, String endDate) {
        // REQ-NEW-4: Apply filters when present; use basic tenant query when no filters
        if (status != null && !status.isEmpty()) {
            try {
                com.sentinel.scaner_orchestrator_service.domain.enums.ScanStatus scanStatus =
                        com.sentinel.scaner_orchestrator_service.domain.enums.ScanStatus.valueOf(status.toUpperCase());
                return scanJobRepository.findByTenantIdAndStatus(tenantId, scanStatus, pageable)
                        .map(this::mapToDTO);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter value: {}", status);
            }
        }
        return scanJobRepository.findByTenantId(tenantId, pageable)
                .map(this::mapToDTO);
    }

    public Page<ScanResponseDTO> getScansByUser(UUID userId, UUID tenantId, Pageable pageable) {
        return scanJobRepository.findByUserIdAndTenantId(userId, tenantId, pageable)
                .map(this::mapToDTO);
    }

    public ScanResponseDTO getScan(UUID id) {
        return scanJobRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new RuntimeException("Scan not found"));
    }

    private ScanResponseDTO mapToDTO(ScanJob job) {
        return ScanResponseDTO.builder()
                .id(job.getId())
                .tenantId(job.getTenantId())
                .projectId(job.getProjectId())
                .type(job.getType())
                .status(job.getStatus())
                .targetUrl(job.getTargetUrl())
                .targetRepo(job.getTargetRepo())
                .createdAt(job.getCreatedAt())
                .finishedAt(job.getFinishedAt())
                .failureReason(job.getFailureReason())
                .build();
    }
}

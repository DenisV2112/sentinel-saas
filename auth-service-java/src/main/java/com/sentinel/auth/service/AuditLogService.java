package com.sentinel.auth.service;

import com.sentinel.auth.entity.AuditLogEntity;
import com.sentinel.auth.enums.AuditAction;
import com.sentinel.auth.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    public void logAction(
            UUID userId,
            UUID tenantId,
            AuditAction action,
            String details,
            String ipAddress,
            String userAgent,
            boolean success,
            String errorMessage
    ) {
        try {
            AuditLogEntity logEntity = AuditLogEntity.builder()
                    .userId(userId)
                    .tenantId(tenantId)
                    .action(action)
                    .details(details)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .success(success)
                    .errorMessage(errorMessage)
                    .build();

            auditLogRepository.save(logEntity);
            log.debug("Audit log created for action: {}", action); // ← log.debug NO logEntity.debug
        } catch (Exception e) {
            log.error("Failed to create audit log: {}", e.getMessage());
            // No lanzar excepción para no interrumpir el flujo principal
        }
    }
}

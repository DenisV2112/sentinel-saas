package com.sentinel.scaner_orchestrator_service.repository;

import com.sentinel.scaner_orchestrator_service.domain.ScanJob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.sentinel.scaner_orchestrator_service.domain.enums.ScanStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScanJobRepository extends JpaRepository<ScanJob, UUID>, JpaSpecificationExecutor<ScanJob> {
    Page<ScanJob> findByTenantId(UUID tenantId, Pageable pageable);

    Page<ScanJob> findByUserId(UUID userId, Pageable pageable);

    Page<ScanJob> findByUserIdAndTenantId(UUID userId, UUID tenantId, Pageable pageable);

    List<ScanJob> findByStatus(ScanStatus status);

    /**
     * REQ-NEW-4: Filter scans by tenant AND status for scan list filtering.
     */
    Page<ScanJob> findByTenantIdAndStatus(UUID tenantId, ScanStatus status, Pageable pageable);
}

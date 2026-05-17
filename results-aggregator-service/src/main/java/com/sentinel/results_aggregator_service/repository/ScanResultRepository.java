package com.sentinel.results_aggregator_service.repository;

import com.sentinel.results_aggregator_service.domain.ScanResult;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScanResultRepository extends MongoRepository<ScanResult, String> {
    Optional<ScanResult> findByScanId(UUID scanId);

    void deleteByScanId(UUID scanId);

    List<ScanResult> findByTenantIdAndDetectedAtAfterOrderByDetectedAtAsc(UUID tenantId, LocalDateTime since);
}

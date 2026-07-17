package com.sentinel.common.security.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO compartido de Tenant. Campo presente solo si es relevante para el servicio.
 * Cada servicio enumera los datos que necesita.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TenantDTO {

    private UUID id;
    private String name;
    private String slug;

    // tenant-service: TenantType enum → String
    private String type;

    private UUID ownerId;
    private String ownerEmail;
    private String businessName;
    private String nit;

    // planId: billing plan identifier (tenant-service)
    // plan:   plan name like "FREE" (auth, project, user-mgmt, orchestrator)
    private String planId;
    private String plan;

    private String subscriptionStatus;
    private String status; // tenant status: ACTIVE, SUSPENDED, DELETED

    private Limits limits;
    private Usage usage;

    private UUID subscriptionId;
    private LocalDateTime nextBillingDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Limits {
        private int maxUsers;
        private int maxProjects;
        private int maxDomains;
        private int maxRepos;
        private boolean blockchainEnabled;
        private boolean aiEnabled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Usage {
        private int currentUsers;
        private int currentProjects;
        private int currentDomains;
        private int currentRepos;
    }
}

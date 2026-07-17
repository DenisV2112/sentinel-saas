package com.sentinel.common.security.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO combinado con suscripción y límites del plan (desde billing-service).
 * Compartido entre tenant, project, user-management y billing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TenantSubscriptionLimitsDTO {

    private String tenantId;
    private String subscriptionId;
    private String planId;
    private String planName;
    private String subscriptionStatus;

    // Límites del plan
    private Integer maxUsers;
    private Integer maxProjects;
    private Integer maxDomains;
    private Integer maxRepos;
    private Boolean includesBlockchain;
}

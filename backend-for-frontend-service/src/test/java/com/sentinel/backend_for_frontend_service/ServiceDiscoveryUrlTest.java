package com.sentinel.backend_for_frontend_service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * C1: Verifies BFF service discovery URLs use correct internal ports.
 * - Docker profile had user-management on :8088 (WRONG — should be :8083).
 * - Default profile was missing user-management-url entirely.
 *
 * RED phase: Docker profile assertion should FAIL because current value is :8088.
 */
@SpringBootTest
@ActiveProfiles("docker")
class ServiceDiscoveryUrlTest {

    @Value("${app.services.user-management-url}")
    private String userManagementUrl;

    @Test
    void userManagementUrlShouldUseCorrectInternalPort() {
        assertEquals("http://user-management-service:8083", userManagementUrl,
                "BFF must call user-management on internal port 8083, not external 8088");
    }
}

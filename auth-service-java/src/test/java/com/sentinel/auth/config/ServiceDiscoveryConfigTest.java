package com.sentinel.auth.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * C2: Verifies inter-service discovery URLs in auth service.
 * Default profile had wrong hostnames (sentinel-tenant-service instead of tenant-service).
 *
 * RED phase: These assertions should FAIL because current config has wrong values.
 * - services.tenant.url = http://sentinel-tenant-service:8082 (WRONG → should be tenant-service)
 * - services.user-management.url = http://user-management-service:8083 (CORRECT)
 */
@SpringBootTest
class ServiceDiscoveryConfigTest {

    @Value("${services.tenant.url}")
    private String tenantServiceUrl;

    @Value("${services.user-management.url}")
    private String userManagementUrl;

    @Test
    void tenantServiceUrlShouldUseCorrectDockerHostname() {
        assertEquals("http://tenant-service:8082", tenantServiceUrl,
                "tenant-service must use 'tenant-service' hostname, not 'sentinel-tenant-service'");
    }

    @Test
    void userManagementServiceUrlShouldUseCorrectInternalPort() {
        assertEquals("http://user-management-service:8083", userManagementUrl,
                "user-management must use internal port 8083, not 8088 or 8085");
    }
}

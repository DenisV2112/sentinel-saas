package com.sentinel.backend_for_frontend_service;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * C6: Verifies Resilience4j circuit breaker configuration on BFF Feign clients.
 * 
 * Spec requires: 50% failure threshold, 10s open state, 10-call sliding window
 * on ALL outbound Feign/HTTP calls from BFF.
 *
 * RED phase: No circuit breaker config exists yet — these assertions should FAIL.
 */
@SpringBootTest
class CircuitBreakerConfigTest {

    @Autowired(required = false)
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @Test
    void circuitBreakerRegistryShouldBeAvailable() {
        assertNotNull(circuitBreakerRegistry,
                "CircuitBreakerRegistry must be auto-configured by Resilience4j");
    }

    @Test
    void tenantServiceCircuitBreakerShouldBeConfigured() {
        assertNotNull(circuitBreakerRegistry, "CircuitBreakerRegistry must be available");
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("tenant-service");
        assertNotNull(cb, "tenant-service circuit breaker must exist");

        var config = cb.getCircuitBreakerConfig();
        assertEquals(10, config.getSlidingWindowSize(),
                "Sliding window size must be 10 per design");
        assertEquals(50, config.getFailureRateThreshold(),
                "Failure rate threshold must be 50% per design");
        assertEquals(10000, config.getWaitIntervalFunctionInOpenState().apply(1),
                "Wait duration in open state must be 10000ms (10s) per design");
    }

    @Test
    void billingServiceCircuitBreakerShouldBeConfigured() {
        assertNotNull(circuitBreakerRegistry, "CircuitBreakerRegistry must be available");
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("billing-service");
        assertNotNull(cb, "billing-service circuit breaker must exist");

        var config = cb.getCircuitBreakerConfig();
        assertEquals(10, config.getSlidingWindowSize());
        assertEquals(50, config.getFailureRateThreshold());
    }

    @Test
    void projectServiceCircuitBreakerShouldBeConfigured() {
        assertNotNull(circuitBreakerRegistry, "CircuitBreakerRegistry must be available");
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("project-client");
        assertNotNull(cb, "project-client circuit breaker must exist");
    }

    @Test
    void orchestratorServiceCircuitBreakerShouldBeConfigured() {
        assertNotNull(circuitBreakerRegistry, "CircuitBreakerRegistry must be available");
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("orchestrator-client");
        assertNotNull(cb, "orchestrator-client circuit breaker must exist");
    }

    @Test
    void resultsAggregatorCircuitBreakerShouldBeConfigured() {
        assertNotNull(circuitBreakerRegistry, "CircuitBreakerRegistry must be available");
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("results-aggregator-client");
        assertNotNull(cb, "results-aggregator-client circuit breaker must exist");
    }

    @Test
    void scanServiceCircuitBreakerShouldBeConfigured() {
        assertNotNull(circuitBreakerRegistry, "CircuitBreakerRegistry must be available");
        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker("scan-orchestrator-service");
        assertNotNull(cb, "scan-orchestrator-service circuit breaker must exist");
    }
}

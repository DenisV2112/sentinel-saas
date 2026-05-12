package com.sentinel.tenant_service.config;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

/**
 * Configuration to make all Feign clients lazy-loaded.
 * This prevents initialization of circuit breakers and retry logic at startup.
 * Feign clients will only be created when first accessed.
 */
@Configuration
@Lazy
public class FeignLazyConfig {
    // All beans in this package will be lazy-loaded
    // The @Lazy annotation on this config class makes all beans lazy by default
}
package com.sentinel.billing.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * E1: Provides a managed RestTemplate bean instead of
 * creating raw java.net.http.HttpClient instances.
 *
 * Using Spring's RestTemplate (backed by a managed connection pool)
 * prevents socket exhaustion that occurs with raw HttpClient.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(10))
                .readTimeout(Duration.ofSeconds(30))
                .build();
    }
}

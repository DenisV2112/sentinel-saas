package com.sentinel.common.security.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Slf4j
@Configuration
public class CorsConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001,http://localhost:5173,http://localhost:5174,http://localhost:8000}")
    private String allowedOrigins;

    @Value("${app.cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS,PATCH}")
    private String allowedMethods;

    @Value("${app.cors.allowed-headers:*}")
    private String allowedHeaders;

    @Value("${app.cors.exposed-headers:Content-Type,Authorization}")
    private String exposedHeaders;

    @Value("${app.cors.allow-credentials:true}")
    private boolean allowCredentials;

    @Value("${app.cors.max-age:3600}")
    private long maxAge;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(allowCredentials);

        // ponytail: setAllowedOriginPatterns handles both "*" and specific origins
        // with credentials; setAllowedOrigins rejects "*" + credentials combination
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .toArray(String[]::new);
        config.setAllowedOriginPatterns(Arrays.asList(origins));

        String[] methods = Arrays.stream(allowedMethods.split(","))
                .map(String::trim)
                .toArray(String[]::new);
        config.setAllowedMethods(Arrays.asList(methods));

        String[] headers = Arrays.stream(allowedHeaders.split(","))
                .map(String::trim)
                .toArray(String[]::new);
        config.setAllowedHeaders(Arrays.asList(headers));

        String[] exposed = Arrays.stream(exposedHeaders.split(","))
                .map(String::trim)
                .toArray(String[]::new);
        config.setExposedHeaders(Arrays.asList(exposed));

        config.setMaxAge(maxAge);

        log.info("CORS configured: origins={}, methods={}, credentials={}",
                Arrays.toString(origins), Arrays.toString(methods), allowCredentials);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}

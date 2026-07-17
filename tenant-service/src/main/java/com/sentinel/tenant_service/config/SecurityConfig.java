package com.sentinel.tenant_service.config;

import com.sentinel.common.security.jwt.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> csrf.disable())
                                .cors(Customizer.withDefaults())
                                .authorizeHttpRequests(auth -> auth
                                                // Internal endpoints (Feign)
                                                .requestMatchers("/api/tenants/internal/**").permitAll()

                                                // Actuator
                                                .requestMatchers("/actuator/**").permitAll()

                                                // All tenant endpoints - permitAll for now (JWT filter handles auth)
                                                .requestMatchers("/api/tenants/**").permitAll()

                                                // Resto requiere autenticación JWT
                                                .anyRequest().authenticated())

                                // Security headers
                                .headers(headers -> headers
                                                .httpStrictTransportSecurity(hsts -> hsts
                                                                .includeSubDomains(true)
                                                                .maxAgeInSeconds(31536000))
                                                .contentSecurityPolicy(csp -> csp
                                                                .policyDirectives("default-src 'self'; " +
                                                                                "script-src 'self'; " +
                                                                                "style-src 'self'; " +
                                                                                "frame-ancestors 'none'"))
                                                .frameOptions(frameOptions -> frameOptions.deny())
                                                .contentTypeOptions(contentTypeOptions -> contentTypeOptions.disable()))

                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }
}
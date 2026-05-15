package com.sentinel.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Configuración OAuth2 - Spring Boot Auto-Configuration
 * 
 * Por ahora usamos la configuración automática de Spring Security OAuth2.
 * Los ClientRegistrations se cargan desde application.properties.
 * 
 * Más adelante implementaremos handlers custom para:
 * - Redirigir al frontend con tokens
 * - Crear tenant automáticamente
 * - Vincular cuentas OAuth2 con cuentas locales
 */
@Configuration
public class OAuth2Config {

    @Value("${spring.security.oauth2.client.registration.google.client-id:}")
    private String googleClientId;

    @Value("${spring.security.oauth2.client.registration.microsoft.client-id:}")
    private String microsoftClientId;

    // Spring Boot auto-configures OAuth2 from application.properties.
    // Custom beans below will be needed when OAuth2 login is activated:
    //
    // TODO: OAuth2AuthenticationSuccessHandler — on success: generate JWT, redirect to frontend
    //       with token, auto-create tenant if first login. See class-level Javadoc for full flow.
    //
    // TODO: OAuth2AuthenticationFailureHandler — on failure: redirect to frontend login page
    //       with error parameter, log failure reason for monitoring.
}
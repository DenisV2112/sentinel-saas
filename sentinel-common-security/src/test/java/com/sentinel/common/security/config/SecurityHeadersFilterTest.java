package com.sentinel.common.security.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class SecurityHeadersFilterTest {

    private final SecurityHeadersFilter filter = new SecurityHeadersFilter();

    @Test
    void shouldAddAllSevenSecurityHeadersToResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> {};

        filter.doFilterInternal(request, response, chain);

        assertEquals("nosniff", response.getHeader("X-Content-Type-Options"),
                "X-Content-Type-Options must be nosniff");
        assertEquals("DENY", response.getHeader("X-Frame-Options"),
                "X-Frame-Options must be DENY");
        assertEquals("1; mode=block", response.getHeader("X-XSS-Protection"),
                "X-XSS-Protection must be 1; mode=block");
        assertEquals("no-referrer", response.getHeader("Referrer-Policy"),
                "Referrer-Policy must be no-referrer");
        assertEquals("geolocation=()", response.getHeader("Permissions-Policy"),
                "Permissions-Policy must be geolocation=()");
        assertEquals("max-age=31536000; includeSubDomains",
                response.getHeader("Strict-Transport-Security"),
                "Strict-Transport-Security must be correct");
        assertEquals("default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';",
                response.getHeader("Content-Security-Policy"),
                "Content-Security-Policy must be correct");
    }

    @Test
    void shouldContinueFilterChainAfterAddingHeaders() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] chainCalled = {false};
        FilterChain chain = (req, res) -> chainCalled[0] = true;

        filter.doFilterInternal(request, response, chain);

        assertTrue(chainCalled[0], "Filter chain must continue after headers are set");
    }
}

package com.sentinel.common.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Date;
import java.util.UUID;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtService jwtService;

    private JwtAuthenticationFilter filter;
    private final String secret = "404E635266556A586E3272357538785000000000000000000000000000000000";

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(jwtService);
        SecurityContextHolder.clearContext();
    }

    private String createToken(String subject, String globalRole) {
        var key = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(secret));
        return Jwts.builder()
                .setSubject(subject)
                .claim("globalRole", globalRole)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void shouldAuthenticateWithValidBearerToken() throws Exception {
        String token = createToken("admin@test.com", "ROLE_ADMIN");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> {};

        when(jwtService.extractUsername(token)).thenReturn("admin@test.com");
        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractClaim(anyString(), any(Function.class))).thenReturn("ROLE_ADMIN");

        filter.doFilterInternal(request, response, chain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth, "SecurityContext must have authentication after valid Bearer token");
        assertEquals("admin@test.com", auth.getPrincipal());
        assertFalse(auth.getAuthorities().isEmpty());
        assertEquals("ROLE_ADMIN", auth.getAuthorities().iterator().next().getAuthority());
    }

    @Test
    void shouldPassThroughWithoutAuthorizationHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] chainCalled = {false};
        FilterChain chain = (req, res) -> chainCalled[0] = true;

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(chainCalled[0], "Chain must continue when no Authorization header");
    }

    @Test
    void shouldPassThroughWithNonBearerAuthorizationHeader() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] chainCalled = {false};
        FilterChain chain = (req, res) -> chainCalled[0] = true;

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication());
        assertTrue(chainCalled[0]);
    }

    @Test
    void shouldPassThroughWhenTokenIsInvalid() throws Exception {
        String token = createToken("bad@test.com", "USER");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] chainCalled = {false};
        FilterChain chain = (req, res) -> chainCalled[0] = true;

        when(jwtService.extractUsername(token)).thenReturn("bad@test.com");
        when(jwtService.isTokenValid(token)).thenReturn(false);

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Authentication must not be set for invalid token");
        assertTrue(chainCalled[0]);
    }

    @Test
    void shouldPassThroughWhenTokenExtractionFails() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer garbage.token.here");
        MockHttpServletResponse response = new MockHttpServletResponse();
        boolean[] chainCalled = {false};
        FilterChain chain = (req, res) -> chainCalled[0] = true;

        when(jwtService.extractUsername("garbage.token.here")).thenThrow(new RuntimeException("Invalid token"));

        filter.doFilterInternal(request, response, chain);

        assertNull(SecurityContextHolder.getContext().getAuthentication(),
                "Authentication must not be set when extraction fails");
        assertTrue(chainCalled[0], "Chain must continue after extraction failure");
    }

    @Test
    void shouldSetEmptyAuthoritiesWhenRoleIsNull() throws Exception {
        String token = createToken("norole@test.com", null);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> {};

        when(jwtService.extractUsername(token)).thenReturn("norole@test.com");
        when(jwtService.isTokenValid(token)).thenReturn(true);
        when(jwtService.extractClaim(anyString(), any(Function.class))).thenReturn(null);

        filter.doFilterInternal(request, response, chain);

        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertTrue(auth.getAuthorities().isEmpty(),
                "Authorities should be empty when globalRole is null");
    }
}

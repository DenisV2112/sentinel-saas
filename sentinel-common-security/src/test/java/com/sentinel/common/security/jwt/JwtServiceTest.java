package com.sentinel.common.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService();
    private final String secretKey = "404E635266556A586E3272357538785000000000000000000000000000000000";

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtService, "secretKey", secretKey);
    }

    private String createToken(String subject, UUID userId, long expirationMillis) {
        var key = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(secretKey));
        return Jwts.builder()
                .setSubject(subject)
                .claim("userId", userId.toString())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    @Test
    void shouldExtractUsernameFromValidToken() {
        String token = createToken("user@test.com", UUID.randomUUID(), 3600000);

        String username = jwtService.extractUsername(token);
        assertEquals("user@test.com", username);
    }

    @Test
    void shouldExtractUserIdFromValidToken() {
        UUID userId = UUID.randomUUID();
        String token = createToken("user@test.com", userId, 3600000);

        UUID extracted = jwtService.extractUserId(token);
        assertEquals(userId, extracted);
    }

    @Test
    void shouldReturnTrueForValidNonExpiredToken() {
        String token = createToken("user@test.com", UUID.randomUUID(), 3600000);

        assertTrue(jwtService.isTokenValid(token));
    }

    @Test
    void shouldReturnFalseForExpiredToken() {
        String token = createToken("user@test.com", UUID.randomUUID(), -1000);

        assertFalse(jwtService.isTokenValid(token),
                "Expired token must be invalid");
    }

    @Test
    void shouldReturnFalseForMalformedToken() {
        assertFalse(jwtService.isTokenValid("this-is-not-a-jwt"),
                "Malformed token must not throw and must return false");
    }

    @Test
    void shouldExtractNullUserIdWhenClaimNotPresent() {
        var key = Keys.hmacShaKeyFor(java.util.Base64.getDecoder().decode(secretKey));
        String token = Jwts.builder()
                .setSubject("no-id-user@test.com")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();

        UUID extracted = jwtService.extractUserId(token);
        assertNull(extracted, "userId should be null when claim is not present");
    }
}

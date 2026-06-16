package com.sentinel.auth.service;

import com.sentinel.auth.entity.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Service responsible for generating and validating JWT tokens.
 * 
 * ✅ OPTIMIZADO: Plan se toma del UserEntity (sin llamada Feign bloqueante).
 * Antes consultaba user_plans via user-management-service (10s timeout en frío).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JWTService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration; // in milliseconds

    /**
     * Generates a JWT token for the provided user.
     * ✅ Consulta plan real desde user_plans table
     */
    public String generateToken(UserDetails userDetails) {
        Map<String, Object> extraClaims = new HashMap<>();

        // ✅ Si es UserEntity, extraer userId y otros datos
        if (userDetails instanceof UserEntity) {
            UserEntity user = (UserEntity) userDetails;
            extraClaims.put("userId", user.getId().toString());
            extraClaims.put("email", user.getEmail());
            extraClaims.put("globalRole", user.getGlobalRole().name());

            // ✅ Usar plan del UserEntity (ya en memoria, sin llamada Feign bloqueante)
            // El plan se sincroniza async después del login si es necesario
            extraClaims.put("plan", user.getPlan().name());

            log.debug("Generated token for user {} with plan: {}", user.getId(), user.getPlan().name());

            if (user.getTenantId() != null) {
                extraClaims.put("tenantId", user.getTenantId().toString());
            }
        }

        return generateToken(extraClaims, userDetails);
    }

    /**
     * Generates JWT token with extra claims.
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .setClaims(extraClaims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(now)
                .setExpiration(expiration)
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Validates if the token is valid and belongs to this user.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
    }

    /**
     * Extracts username from token.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * ✅ Extrae userId del token
     */
    public UUID extractUserId(String token) {
        String userIdStr = extractClaim(token, claims -> claims.get("userId", String.class));
        return userIdStr != null ? UUID.fromString(userIdStr) : null;
    }

    /**
     * ✅ Extrae email del token
     */
    public String extractEmail(String token) {
        return extractClaim(token, claims -> claims.get("email", String.class));
    }

    /**
     * Returns true if token is expired.
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extracts expiration date.
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Generic claim extractor.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Parses token and extracts all claims.
     */
    private Claims extractAllClaims(String token) {
        return Jwts
                .parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    /**
     * Returns signing key for JWT.
     */
    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
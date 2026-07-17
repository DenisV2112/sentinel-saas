package com.sentinel.auth.service;

import com.sentinel.auth.entity.UserEntity;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Token generator. Validation/extraction is handled by common-security's JwtService.
 *
 * ponytail: kept because common's JwtService doesn't generate tokens,
 * and generation needs auth-specific UserEntity claims (userId, email, plan, tenantId).
 */
@Slf4j
@Service
public class JWTService {

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> extraClaims = new HashMap<>();

        if (userDetails instanceof UserEntity user) {
            extraClaims.put("userId", user.getId().toString());
            extraClaims.put("email", user.getEmail());
            extraClaims.put("globalRole", user.getGlobalRole().name());
            extraClaims.put("plan", user.getPlan().name());
            if (user.getTenantId() != null) {
                extraClaims.put("tenantId", user.getTenantId().toString());
            }
            log.debug("Generated token for user {} with plan: {}", user.getId(), user.getPlan().name());
        }

        return generateToken(extraClaims, userDetails);
    }

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

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}

package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.client.TenantClient;
import com.sentinel.backend_for_frontend_service.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Proxy controller for tenant invitation operations.
 * Delegates to tenant-service via {@link TenantClient} Feign interface.
 */
@Slf4j
@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class InvitationProxyController {

    private final TenantClient tenantClient;
    private final JwtUtils jwtUtils;

    @GetMapping("/{tenantId}/invitations")
    public ResponseEntity<?> getInvitations(
            @PathVariable UUID tenantId,
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtils.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid token - could not extract user ID");
        }

        try {
            Object result = tenantClient.getInvitations(tenantId.toString(), authHeader, userId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error fetching invitations: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching invitations: " + e.getMessage());
        }
    }

    @PostMapping("/{tenantId}/invitations")
    public ResponseEntity<?> createInvitation(
            @PathVariable UUID tenantId,
            @RequestBody Object invitationRequest,
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtils.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Invalid token - could not extract user ID");
        }

        try {
            Object result = tenantClient.createInvitation(tenantId.toString(), authHeader, userId, invitationRequest);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error creating invitation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating invitation: " + e.getMessage());
        }
    }

    @DeleteMapping("/invitations/{invitationId}")
    public ResponseEntity<?> cancelInvitation(
            @PathVariable UUID invitationId,
            @RequestHeader("Authorization") String authHeader) {

        String userId = jwtUtils.extractUserId(authHeader);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            tenantClient.cancelInvitation(invitationId.toString(), authHeader, userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error canceling invitation: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
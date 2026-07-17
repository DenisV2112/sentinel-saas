package com.sentinel.tenant_service.exception;

import com.sentinel.common.security.exception.BaseGlobalExceptionHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends BaseGlobalExceptionHandler {

    @ExceptionHandler(TenantNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleTenantNotFound(TenantNotFoundException ex) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(TenantAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleTenantAlreadyExists(TenantAlreadyExistsException ex) {
        return buildErrorResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(TenantLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleLimitExceeded(TenantLimitExceededException ex) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(InvalidNITException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidNIT(InvalidNITException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(TenantSuspendedException.class)
    public ResponseEntity<Map<String, Object>> handleTenantSuspended(TenantSuspendedException ex) {
        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(PlanUpgradeRequiredException.class)
    public ResponseEntity<Map<String, Object>> handlePlanUpgradeRequired(PlanUpgradeRequiredException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", HttpStatus.PAYMENT_REQUIRED.value());
        response.put("error", "PLAN_UPGRADE_REQUIRED");
        response.put("message", ex.getMessage());
        response.put("upgradeUrl", "/api/billing/plans");
        response.put("helpText", "You can still accept invitations to other workspaces");

        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(response);
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            org.springframework.web.server.ResponseStatusException ex) {
        log.warn("⚠️ Handled ResponseStatusException: Status={}, Reason={}", ex.getStatusCode(), ex.getReason());
        return buildErrorResponse(HttpStatus.valueOf(ex.getStatusCode().value()), ex.getReason());
    }
}

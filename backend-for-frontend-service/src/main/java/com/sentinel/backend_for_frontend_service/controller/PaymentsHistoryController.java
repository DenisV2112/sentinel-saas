package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.client.BillingClient;
import com.sentinel.backend_for_frontend_service.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/payments-history")
@RequiredArgsConstructor
public class PaymentsHistoryController {

    private final JwtUtils jwtUtils;
    private final BillingClient billingClient;

    @GetMapping("/me")
    public ResponseEntity<?> getMyPaymentsHistory(@RequestHeader("Authorization") String token) {
        String userId = jwtUtils.extractUserId(token);
        log.info("💰 BFF: Getting payment history for user {}", userId);
        List<Map<String, Object>> history = billingClient.getPaymentHistory(token, userId);
        return ResponseEntity.ok(history);
    }

    @GetMapping
    public ResponseEntity<?> getPaymentsHistory(@RequestHeader("Authorization") String token) {
        String userId = jwtUtils.extractUserId(token);
        log.info("💰 BFF: Getting all payment history for user {}", userId);
        List<Map<String, Object>> history = billingClient.getAllPaymentHistory(token, userId);
        return ResponseEntity.ok(history);
    }
}

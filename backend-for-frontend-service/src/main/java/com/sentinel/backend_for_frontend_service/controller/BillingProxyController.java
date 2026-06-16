package com.sentinel.backend_for_frontend_service.controller;

import com.sentinel.backend_for_frontend_service.client.BillingClient;
import com.sentinel.backend_for_frontend_service.util.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingProxyController {

    private final BillingClient billingClient;
    private final JwtUtils jwtUtils;

    /**
     * Get all available plans
     */
    @GetMapping("/plans")
    public ResponseEntity<?> getPlans(@RequestHeader(value = "Authorization", required = false) String token) {
        log.info("💰 BFF: Getting available plans...");
        try {
            List<Map<String, Object>> plans = billingClient.getPlans(token != null ? token : "");
            log.info("✅ Found {} plans", plans.size());
            return ResponseEntity.ok(plans);

        } catch (feign.FeignException e) {
            log.error("❌ Error fetching plans: {} {}", e.status(), e.getMessage());
            return ResponseEntity.status(e.status())
                    .body(Map.of("error", "Failed to fetch plans", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error fetching plans", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error", "message", e.getMessage()));
        }
    }

    /**
     * Get plan by ID
     */
    @GetMapping("/plans/{planId}")
    public ResponseEntity<?> getPlanById(
            @PathVariable String planId,
            @RequestHeader("Authorization") String token) {
        log.info("💰 BFF: Getting plan: {}", planId);
        try {
            Map<String, Object> plan = billingClient.getPlanById(planId, token);
            return ResponseEntity.ok(plan);
        } catch (feign.FeignException e) {
            log.error("❌ Error fetching plan: {} {}", e.status(), e.getMessage());
            return ResponseEntity.status(e.status())
                    .body(Map.of("error", "Failed to fetch plan", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error", "message", e.getMessage()));
        }
    }

    /**
     * Get current user's subscription
     */
    @GetMapping("/subscriptions/me")
    public ResponseEntity<?> getMySubscription(@RequestHeader("Authorization") String token) {
        log.info("💰 BFF: Getting user's subscription...");

        String userId = jwtUtils.extractUserId(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid token"));
        }

        try {
            Map<String, Object> subscription = billingClient.getMySubscription(token, userId);
            return ResponseEntity.ok(subscription);
        } catch (feign.FeignException e) {
            if (e.status() == 404) {
                return ResponseEntity.ok(Map.of(
                        "plan", "FREE",
                        "status", "ACTIVE",
                        "message", "No paid subscription - using FREE plan"));
            }
            log.warn("⚠️ Billing service unavailable ({}), returning FREE plan default", e.status());
            return ResponseEntity.ok(Map.of(
                    "plan", "FREE",
                    "status", "ACTIVE",
                    "message", "Billing service temporarily unavailable"));
        } catch (Exception e) {
            log.warn("⚠️ Billing service unreachable, returning FREE plan default: {}", e.getMessage());
            return ResponseEntity.ok(Map.of(
                    "plan", "FREE",
                    "status", "ACTIVE",
                    "message", "Billing service temporarily unavailable"));
        }
    }

    /**
     * Create/upgrade subscription (purchase a plan)
     */
    @PostMapping("/subscriptions")
    public ResponseEntity<?> createSubscription(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {
        log.info("💰 BFF: Creating subscription for plan: {}", request.get("planId"));

        String userId = jwtUtils.extractUserId(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid token"));
        }

        try {
            Map<String, Object> subscription = billingClient.createSubscription(token, userId, request);
            log.info("✅ Subscription created successfully");
            return ResponseEntity.status(HttpStatus.CREATED).body(subscription);
        } catch (feign.FeignException e) {
            log.error("❌ Error creating subscription: {} {}", e.status(), e.getMessage());
            return ResponseEntity.status(e.status())
                    .body(Map.of("error", "Failed to create subscription", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error", "message", e.getMessage()));
        }
    }

    /**
     * Update subscription
     */
    @PutMapping("/subscriptions/{subscriptionId}")
    public ResponseEntity<?> updateSubscription(
            @PathVariable String subscriptionId,
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {
        log.info("💰 BFF: Updating subscription: {}", subscriptionId);

        String userId = jwtUtils.extractUserId(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid token"));
        }

        try {
            Map<String, Object> subscription = billingClient.updateSubscription(subscriptionId, token, userId, request);
            return ResponseEntity.ok(subscription);
        } catch (feign.FeignException e) {
            log.error("❌ Error updating subscription: {} {}", e.status(), e.getMessage());
            return ResponseEntity.status(e.status())
                    .body(Map.of("error", "Failed to update subscription", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error", "message", e.getMessage()));
        }
    }

    /**
     * Cancel subscription
     */
    @DeleteMapping("/subscriptions/{subscriptionId}")
    public ResponseEntity<?> cancelSubscription(
            @PathVariable String subscriptionId,
            @RequestHeader("Authorization") String token) {
        log.info("💰 BFF: Cancelling subscription: {}", subscriptionId);

        String userId = jwtUtils.extractUserId(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid token"));
        }

        try {
            Map<String, Object> result = billingClient.cancelSubscription(subscriptionId, token, userId);
            return ResponseEntity.ok(result);
        } catch (feign.FeignException e) {
            log.error("❌ Error cancelling subscription: {} {}", e.status(), e.getMessage());
            return ResponseEntity.status(e.status())
                    .body(Map.of("error", "Failed to cancel subscription", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error", "message", e.getMessage()));
        }
    }

    /**
     * Get payment history for user
     */
    @GetMapping("/payments-history/me")
    public ResponseEntity<?> getPaymentHistory(@RequestHeader(value = "Authorization", required = false) String token) {
        log.info("💰 BFF: Getting user's payment history...");
        try {
            String userId = jwtUtils.extractUserId(token != null ? token : "");
            if (userId == null) {
                return ResponseEntity.ok(List.of());
            }
            List<Map<String, Object>> history = billingClient.getPaymentHistory(token, userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("❌ Error fetching payment history", e);
            return ResponseEntity.ok(List.of());
        }
    }

    /**
     * Create checkout for plan upgrade (MercadoPago)
     */
    @PostMapping("/subscriptions/checkout")
    public ResponseEntity<?> createCheckout(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {
        log.info("💳 BFF: Creating checkout for plan: {}", request.get("planId"));

        String userId = jwtUtils.extractUserId(token);
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid token"));
        }

        try {
            Map<String, Object> checkout = billingClient.createMercadoPagoCheckout(token, userId, request);
            return ResponseEntity.ok(checkout);
        } catch (feign.FeignException e) {
            log.error("❌ Error creating checkout: {} {}", e.status(), e.getMessage());
            return ResponseEntity.status(e.status())
                    .body(Map.of("error", "Failed to create checkout", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Unexpected error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error", "message", e.getMessage()));
        }
    }
}

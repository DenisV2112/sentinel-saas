package com.sentinel.billing.controller;

import com.sentinel.billing.events.BillingEventPublisher;
import com.sentinel.billing.model.PaymentEntity;
import com.sentinel.billing.model.PaymentStatus;
import com.sentinel.billing.model.PlanEntity;
import com.sentinel.billing.model.SubscriptionEntity;
import com.sentinel.billing.model.SubscriptionStatus;
import com.sentinel.billing.repository.PaymentRepository;
import com.sentinel.billing.repository.PlanRepository;
import com.sentinel.billing.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for MercadoPago webhook handling.
 * Includes a test endpoint for development/testing purposes.
 */
@Slf4j
@RestController
@RequestMapping("/api/webhooks/mercadopago")
@RequiredArgsConstructor
public class MercadoPagoWebhookController {

    private final PaymentRepository paymentRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final BillingEventPublisher billingEventPublisher;
    private final RestTemplate restTemplate;

    /**
     * Test webhook endpoint for development.
     * Simulates a successful MercadoPago payment and upgrades the user's plan.
     */
    @PostMapping("/test")
    @Transactional
    public ResponseEntity<?> testWebhook(
            @RequestParam String paymentId,
            @RequestParam String planId,
            @RequestParam(required = false) String userId) {

        log.info("🧪 Test webhook received - paymentId: {}, planId: {}, userId: {}",
                paymentId, planId, userId);

        try {
            // Get plan details
            PlanEntity plan = planRepository.findById(planId)
                    .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));

            // Create or update payment record
            String finalPaymentId = paymentId != null && !paymentId.startsWith("test_")
                    ? paymentId
                    : "pay_" + UUID.randomUUID().toString();

            PaymentEntity payment = paymentRepository.findById(finalPaymentId)
                    .orElseGet(() -> new PaymentEntity()
                            .setId(finalPaymentId)
                            .setProvider("MERCADOPAGO_TEST")
                            .setUserId(userId != null && !userId.isBlank() ? userId : "test-user")
                            .setTenantId("default")
                            .setPlanId(planId)
                            .setAmount(plan.getMonthlyPriceUsd())
                            .setCurrency("USD")
                            .setStatus(PaymentStatus.PENDING));

            // Mark payment as successful
            payment.setStatus(PaymentStatus.SUCCEEDED);
            payment.setPaidAt(OffsetDateTime.now());
            payment.setExternalPaymentId("MP_TEST_" + System.currentTimeMillis());
            paymentRepository.save(payment);

            // Create or update subscription
            String finalUserId = userId != null && !userId.isBlank() ? userId : "test-user";
            SubscriptionEntity subscription = subscriptionRepository.findByUserId(finalUserId)
                    .orElseGet(() -> new SubscriptionEntity()
                            .setId("sub_" + UUID.randomUUID().toString())
                            .setUserId(finalUserId)
                            .setTenantId("default"));

            subscription.setPlanId(planId);
            subscription.setStatus(SubscriptionStatus.ACTIVE);
            subscription.setCurrentPeriodStart(OffsetDateTime.now());
            subscription.setCurrentPeriodEnd(OffsetDateTime.now().plusMonths(1));
            subscriptionRepository.save(subscription);

            // Publish event so user-management updates the user's plan
            billingEventPublisher.publishSubscriptionCreated(
                    subscription.getId(),
                    subscription.getTenantId(),
                    finalUserId,
                    plan.getId(),
                    Map.of());

            // Also directly update user-management via REST (fallback if RabbitMQ unavailable)
            try {
                String userMgmtUrl = "http://user-management-service:8083/api/internal/users/"
                        + finalUserId + "/plan";
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                Map<String, String> body = Map.of("planId", plan.getId());
                restTemplate.put(userMgmtUrl, new HttpEntity<>(body, headers));
                log.info("✅ User plan updated in user-management: {} -> {}", finalUserId, plan.getId());
            } catch (Exception e) {
                log.warn("⚠️ Failed to update user plan in user-management via REST: {}", e.getMessage());
            }

            log.info("✅ Test payment processed - User {} upgraded to plan {}",
                    finalUserId, planId);

            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "message", "Payment processed successfully (TEST MODE)",
                    "paymentId", payment.getId(),
                    "subscriptionId", subscription.getId(),
                    "planId", planId,
                    "planName", plan.getName()));

        } catch (IllegalArgumentException e) {
            log.error("❌ Invalid request: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Error processing test webhook", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to process payment", "message", e.getMessage()));
        }
    }

    /**
     * Real webhook endpoint for MercadoPago IPN notifications.
     */
    @PostMapping
    public ResponseEntity<?> handleWebhook(@RequestBody Map<String, Object> payload) {
        log.info("📬 MercadoPago webhook received: {}", payload);

        // In production, verify the webhook signature and process accordingly
        // For now, just acknowledge receipt
        return ResponseEntity.ok(Map.of("status", "received"));
    }
}

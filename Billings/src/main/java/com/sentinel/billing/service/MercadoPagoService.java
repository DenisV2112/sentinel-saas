package com.sentinel.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinel.billing.dto.MercadoPagoPreferenceResponse;
import com.sentinel.billing.model.PaymentEntity;
import com.sentinel.billing.model.PaymentStatus;
import com.sentinel.billing.model.PlanEntity;
import com.sentinel.billing.model.SubscriptionEntity;
import com.sentinel.billing.model.SubscriptionStatus;
import com.sentinel.billing.repository.PaymentRepository;
import com.sentinel.billing.repository.PlanRepository;
import com.sentinel.billing.repository.SubscriptionRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
public class MercadoPagoService {

        private final PaymentRepository paymentRepository;
        private final SubscriptionRepository subscriptionRepository;
        private final PlanRepository planRepository;
        private final RabbitTemplate rabbitTemplate;
        private final RestTemplate restTemplate;
        private final ObjectMapper objectMapper;

        @Value("${mercadopago.access_token}")
        private String accessToken;

        @Value("${app.url:http://localhost:3001}")
        private String appUrl;

        public MercadoPagoService(
                        PaymentRepository paymentRepository,
                        SubscriptionRepository subscriptionRepository,
                        PlanRepository planRepository,
                        RabbitTemplate rabbitTemplate,
                        RestTemplate restTemplate,
                        ObjectMapper objectMapper) {
                this.paymentRepository = paymentRepository;
                this.subscriptionRepository = subscriptionRepository;
                this.planRepository = planRepository;
                this.rabbitTemplate = rabbitTemplate;
                this.restTemplate = restTemplate;
                this.objectMapper = objectMapper;
        }

        /**
         * Creates MercadoPago preference for plan upgrade
         * Configured for Colombia (COP) with test cards
         */
        public Map<String, String> createPreference(String planId, String userId, String tenantId) {
                try {
                        if (accessToken == null || accessToken.isBlank()) {
                                throw new IllegalStateException("MercadoPago access token is not configured");
                        }

                        log.info("🇨🇴 Creating MercadoPago preference for Colombia (COP)");

                        // Get plan details
                        PlanEntity plan = planRepository.findById(planId)
                                        .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + planId));

                        // Use COP price (pesos colombianos)
                        java.math.BigDecimal priceCop = plan.getMonthlyPriceCop();
                        if (priceCop == null || priceCop.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                                priceCop = new java.math.BigDecimal("10000"); // Default 10,000 COP
                        }

                        // Create payment record in PENDING status
                        String paymentId = "pay_" + UUID.randomUUID().toString();
                        PaymentEntity payment = new PaymentEntity()
                                        .setId(paymentId)
                                        .setProvider("MERCADOPAGO")
                                        .setTenantId(tenantId)
                                        .setUserId(userId)
                                        .setPlanId(planId)
                                        .setAmount(priceCop)
                                        .setCurrency("COP")
                                        .setStatus(PaymentStatus.PENDING);
                        paymentRepository.save(payment);

                        String description = plan.getDescription() != null
                                        ? plan.getDescription()
                                        : "Sentinel " + plan.getName() + " Plan";

                        log.info("💰 Price: ${} COP (${} USD equivalent)",
                                        priceCop.intValue(), plan.getMonthlyPriceUsd());

                        // Preference JSON for Colombia
                        String preferenceJson = String.format("""
                                        {
                                                "items": [{
                                                        "title": "Sentinel %s",
                                                        "description": "%s",
                                                        "quantity": 1,
                                                        "currency_id": "COP",
                                                        "unit_price": %d
                                                }],
                                                "payer": {
                                                        "email": "test_user_%s@testuser.com"
                                                },
                                                "payment_methods": {
                                                        "installments": 12
                                                },
                                                "back_urls": {
                                                        "success": "%s/billing?status=success",
                                                        "failure": "%s/billing?status=failure",
                                                        "pending": "%s/billing?status=pending"
                                                },
                                                "statement_descriptor": "SENTINEL",
                                                "external_reference": "%s"
                                        }
                                        """,
                                        plan.getName(),
                                        description.replace("\"", "\\\""),
                                        priceCop.intValue(),
                                        userId.substring(0, Math.min(8, userId.length())),
                                        appUrl,
                                        appUrl,
                                        appUrl,
                                        paymentId);

                        log.debug("Sending preference: {}", preferenceJson);

                        // Call MercadoPago API via managed RestTemplate (E1 — prevents socket exhaustion)
                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_JSON);
                        headers.set("Authorization", "Bearer " + accessToken);
                        headers.set("X-Idempotency-Key", UUID.randomUUID().toString());

                        HttpEntity<String> requestEntity = new HttpEntity<>(preferenceJson, headers);

                        ResponseEntity<String> responseEntity = restTemplate.postForEntity(
                                        "https://api.mercadopago.com/checkout/preferences",
                                        requestEntity,
                                        String.class);

                        int statusCode = responseEntity.getStatusCodeValue();
                        log.info("MercadoPago Response: {}", statusCode);

                        if (statusCode != 200 && statusCode != 201) {
                                String errorBody = responseEntity.getBody();
                                log.error("❌ MercadoPago Error [{}]: {}", statusCode, errorBody);
                                throw new RuntimeException(
                                                "MercadoPago API error: " + statusCode + " - " + errorBody);
                        }

                        // Parse response via Jackson ObjectMapper (E2 — replaces fragile manual string parsing)
                        MercadoPagoPreferenceResponse mpResponse = objectMapper.readValue(
                                        responseEntity.getBody(),
                                        MercadoPagoPreferenceResponse.class);

                        String preferenceId = mpResponse.getId();
                        String initPoint = mpResponse.getInitPoint();
                        String sandboxInitPoint = mpResponse.getSandboxInitPoint();

                        String checkoutUrl = accessToken.startsWith("TEST-") ? sandboxInitPoint : initPoint;

                        log.info("✅ Preference created - ID: {}", preferenceId);

                        return Map.of(
                                        "preferenceId", preferenceId,
                                        "initPoint", checkoutUrl,
                                        "paymentId", paymentId);

                } catch (Exception e) {
                        log.error("❌ Error creating preference", e);
                        throw new RuntimeException("Failed to create payment: " + e.getMessage(), e);
                }
        }

        @Transactional
        public void handleWebhook(Map<String, Object> payload) {
                try {
                        String type = (String) payload.get("type");
                        if (!"payment".equals(type)) {
                                return;
                        }

                        Map<String, Object> data = (Map<String, Object>) payload.get("data");
                        String mpPaymentId = data.get("id").toString();

                        PaymentEntity payment = paymentRepository.findByExternalPaymentId(mpPaymentId)
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Payment not found: " + mpPaymentId));

                        String action = (String) payload.get("action");

                        if ("payment.updated".equals(action) || "payment.created".equals(action)) {
                                payment.setStatus(PaymentStatus.SUCCEEDED);
                                payment.setPaidAt(OffsetDateTime.now());
                                paymentRepository.save(payment);

                                createOrUpdateSubscription(payment);
                                publishPaymentSuccessEvent(payment);
                        }

                } catch (Exception e) {
                        throw new RuntimeException("Error handling webhook: " + e.getMessage(), e);
                }
        }

        private void createOrUpdateSubscription(PaymentEntity payment) {
                SubscriptionEntity subscription = subscriptionRepository.findByUserId(payment.getUserId())
                                .orElse(null);

                OffsetDateTime now = OffsetDateTime.now();
                OffsetDateTime periodEnd = now.plusMonths(1);

                if (subscription == null) {
                        subscription = new SubscriptionEntity()
                                        .setId("sub_" + UUID.randomUUID().toString())
                                        .setUserId(payment.getUserId())
                                        .setTenantId(payment.getTenantId())
                                        .setPlanId(payment.getPlanId())
                                        .setStatus(SubscriptionStatus.ACTIVE)
                                        .setCurrentPeriodStart(now)
                                        .setCurrentPeriodEnd(periodEnd);
                } else {
                        subscription.setPlanId(payment.getPlanId())
                                        .setStatus(SubscriptionStatus.ACTIVE)
                                        .setCurrentPeriodStart(now)
                                        .setCurrentPeriodEnd(periodEnd);
                }

                subscriptionRepository.save(subscription);
        }

        private void publishPaymentSuccessEvent(PaymentEntity payment) {
                Map<String, Object> event = Map.of(
                                "userId", payment.getUserId(),
                                "tenantId", payment.getTenantId(),
                                "planId", payment.getPlanId(),
                                "paymentId", payment.getId(),
                                "amount", payment.getAmount(),
                                "timestamp", OffsetDateTime.now().toString());

                rabbitTemplate.convertAndSend(
                                "billing-exchange",
                                "billing.payment.succeeded",
                                event);
        }
}
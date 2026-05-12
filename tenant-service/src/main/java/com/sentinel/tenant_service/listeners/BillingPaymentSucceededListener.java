package com.sentinel.tenant_service.listeners;

import com.sentinel.tenant_service.entity.TenantEntity;
import com.sentinel.tenant_service.repository.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Listener para eventos de pago exitoso desde Billing-Service.
 * LAZY INIT: Only active when RabbitMQ is used.
 */
@Component
@Lazy
public class BillingPaymentSucceededListener {

    private static final Logger log = LoggerFactory.getLogger(BillingPaymentSucceededListener.class);

    private final TenantRepository tenantRepository;

    public BillingPaymentSucceededListener(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @RabbitListener(queues = "tenant-billing-payment-queue", concurrency = "1")
    public void handlePaymentSucceeded(@Payload Map<String, Object> payload) {
        log.info("💳 Evento recibido: billing.payment_succeeded -> Payload: {}", payload);

        String tenantIdStr = (String) payload.get("tenantId");
        String planId = (String) payload.get("planId");

        if (tenantIdStr == null) {
            log.warn("⚠️ Payload incompleto: tenantId es nulo en billing.payment_succeeded");
            return;
        }

        UUID tenantId;
        try {
            tenantId = UUID.fromString(tenantIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("⚠️ TenantId inválido: {}", tenantIdStr);
            return;
        }

        Optional<TenantEntity> optional = tenantRepository.findById(tenantId);
        if (optional.isEmpty()) {
            log.warn("⚠️ Tenant no encontrado: {}", tenantId);
            return;
        }

        TenantEntity tenant = optional.get();
        
        // Actualizar SOLO la próxima fecha de pago (próximo mes)
        // NO modificamos el plan aquí - el plan se maneja a través de TenantPlan existente
        tenant.setNextBillingDate(LocalDateTime.now().plusMonths(1));

        tenantRepository.save(tenant);

        log.info("✅ Tenant {} - Próximo pago programado para: {}", 
                tenantId, tenant.getNextBillingDate());
    }
}

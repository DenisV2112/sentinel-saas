package com.sentinel.tenant_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

/**
 * RabbitMQ Configuration with LAZY initialization.
 * All queues and exchanges are lazily loaded to reduce startup CPU.
 */
@Configuration
@Lazy
public class RabbitMQConfig {

    @Value("${tenant.events.exchange:tenant-exchange}")
    private String tenantExchangeName;

    @Value("${tenant.events.created-routing-key:tenant.created}")
    private String createdRoutingKey;

    @Value("${tenant.events.upgraded-routing-key:tenant.plan.upgraded}")
    private String upgradedRoutingKey;

    // -------------------------------
    // EXCHANGE (LAZY)
    // -------------------------------

    @Bean
    @Lazy
    public TopicExchange tenantExchange() {
        return new TopicExchange(tenantExchangeName, true, false);
    }

// -------------------------------
    // QUEUES (LAZY)
    // -------------------------------

    @Bean
    @Lazy
    public Queue tenantCreatedQueue() {
        return new Queue("tenant.created.queue", true);
    }

    @Bean
    @Lazy
    public Queue tenantUpgradedQueue() {
        return new Queue("tenant.upgraded.queue", true);
    }

    // -------------------------------
    // AUTH USER REGISTERED (for UserRegisteredListener)
    // -------------------------------

    @Bean
    @Lazy
    public Queue authUserRegisteredQueue() {
        return QueueBuilder.durable("auth.user.registered.queue").build();
    }

    @Bean
    @Lazy
    public TopicExchange authExchange() {
        return new TopicExchange("auth-exchange", true, false);
    }

    @Bean
    @Lazy
    public Binding authUserRegisteredBinding() {
        return BindingBuilder
                .bind(authUserRegisteredQueue())
                .to(authExchange())
                .with("auth.user.registered");
    }

    // -------------------------------
    // BILLING QUEUES (LAZY)
    // -------------------------------

    @Bean
    @Lazy
    public Binding tenantUpgradedBinding() {
        return BindingBuilder
                .bind(tenantUpgradedQueue())
                .to(tenantExchange())
                .with(upgradedRoutingKey);
    }

    // -------------------------------
    // BILLING INTEGRATION (LAZY)
    // -------------------------------

    @Bean
    @Lazy
    public TopicExchange billingExchange() {
        return new TopicExchange("sentinel-billing-exchange", true, false);
    }

    @Bean
    @Lazy
    public Queue tenantBillingSubscriptionQueue() {
        return new Queue("tenant.billing.subscription.queue", true);
    }

    @Bean
    @Lazy
    public Binding tenantBillingSubscriptionBinding() {
        return BindingBuilder
                .bind(tenantBillingSubscriptionQueue())
                .to(billingExchange())
                .with("billing.subscription.created");
    }

    @Bean
    @Lazy
    public Queue tenantBillingPaymentQueue() {
        return new Queue("tenant-billing-payment-queue", true);
    }

    @Bean
    @Lazy
    public Binding tenantBillingPaymentBinding() {
        return BindingBuilder
                .bind(tenantBillingPaymentQueue())
                .to(billingExchange())
                .with("billing.payment_succeeded");
    }

    // -------------------------------
    // JSON CONVERTER + RABBIT TEMPLATE
    // -------------------------------

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(
            ConnectionFactory connectionFactory,
            MessageConverter messageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter);
        return template;
    }
}

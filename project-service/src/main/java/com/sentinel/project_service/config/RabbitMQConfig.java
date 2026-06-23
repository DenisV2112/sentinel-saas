package com.sentinel.project_service.config;

import jakarta.annotation.PostConstruct;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

@Configuration
public class RabbitMQConfig {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RabbitMQConfig.class);

    @Value("${project.events.exchange}")
    private String projectExchange;

    private final ConnectionFactory connectionFactory;

    public RabbitMQConfig(ConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    // ========================================
    // EXCHANGES
    // ========================================
    
    @Bean
    @Lazy(false)
    public TopicExchange projectExchange() {
        return new TopicExchange(projectExchange, true, false);
    }

    @Bean
    @Lazy(false)
    public TopicExchange tenantExchange() {
        return new TopicExchange("tenant-exchange", true, false);
    }

    @Bean
    @Lazy(false)
    public TopicExchange domainExchange() {
        return new TopicExchange("domain-exchange", true, false);
    }

    @Bean
    @Lazy(false)
    public TopicExchange billingExchange() {
        return new TopicExchange("billing-exchange", true, false);
    }

    // ========================================
    // QUEUES (Para publicar eventos)
    // ========================================
    
    @Bean
    public Queue projectCreatedQueue() {
        return QueueBuilder
                .durable("project.created.queue")
                .build();
    }

    @Bean
    public Queue projectDeletedQueue() {
        return QueueBuilder
                .durable("project.deleted.queue")
                .build();
    }

    @Bean
    public Queue domainAddedQueue() {
        return QueueBuilder
                .durable("project.domain.added.queue")
                .build();
    }

    @Bean
    public Queue repoAddedQueue() {
        return QueueBuilder
                .durable("project.repo.added.queue")
                .build();
    }

    // ========================================
    // QUEUES (Para consumir eventos)
    // ========================================
    
    // Queue para consumir tenant.plan.upgraded
    @Bean
    public Queue tenantUpgradedQueue() {
        return QueueBuilder
                .durable("project.tenant.upgraded.queue")
                .build();
    }

    // Queue para consumir domain.verified (desde C#)
    @Bean
    public Queue domainVerifiedQueue() {
        return QueueBuilder
                .durable("project.domain.verified.queue")
                .build();
    }

    // Queue para consumir billing.payment_succeeded
    @Bean
    public Queue projectBillingPaymentQueue() {
        return QueueBuilder
                .durable("project-billing-payment-queue")
                .build();
    }

    // ========================================
    // BINDINGS
    // ========================================
    
    @Bean
    public Binding projectCreatedBinding() {
        return BindingBuilder
                .bind(projectCreatedQueue())
                .to(projectExchange())
                .with("project.created");
    }

    @Bean
    public Binding projectDeletedBinding() {
        return BindingBuilder
                .bind(projectDeletedQueue())
                .to(projectExchange())
                .with("project.deleted");
    }

    @Bean
    public Binding domainAddedBinding() {
        return BindingBuilder
                .bind(domainAddedQueue())
                .to(projectExchange())
                .with("domain.added");
    }

    @Bean
    public Binding repoAddedBinding() {
        return BindingBuilder
                .bind(repoAddedQueue())
                .to(projectExchange())
                .with("repository.added");
    }

    @Bean
    public Binding tenantUpgradedBinding() {
        return BindingBuilder
                .bind(tenantUpgradedQueue())
                .to(tenantExchange())
                .with("tenant.plan.upgraded");
    }

    @Bean
    public Binding domainVerifiedBinding() {
        return BindingBuilder
                .bind(domainVerifiedQueue())
                .to(domainExchange())
                .with("domain.verified");
    }

    @Bean
    public Binding projectBillingPaymentBinding() {
        return BindingBuilder
                .bind(projectBillingPaymentQueue())
                .to(billingExchange())
                .with("billing.payment_succeeded");
    }

    // ========================================
    // MESSAGE CONVERTER
    // ========================================
    
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }

    // ========================================
    // RABBIT ADMIN — ensures exchanges exist
    // ========================================

    @Bean
    @Lazy(false)
    public RabbitAdmin rabbitAdmin() {
        RabbitAdmin admin = new RabbitAdmin(connectionFactory);
        admin.setAutoStartup(true);
        return admin;
    }

    @PostConstruct
    public void initExchanges() {
        log.info("Explicitly declaring RabbitMQ exchanges...");
        RabbitAdmin admin = new RabbitAdmin(connectionFactory);
        // Explicit declaration bypasses lazy bean discovery issue with spring.main.lazy-initialization=true
        admin.declareExchange(new TopicExchange(projectExchange, true, false));
        admin.declareExchange(new TopicExchange("tenant-exchange", true, false));
        admin.declareExchange(new TopicExchange("domain-exchange", true, false));
        admin.declareExchange(new TopicExchange("billing-exchange", true, false));
        log.info("RabbitMQ exchanges declared explicitly");
    }
}
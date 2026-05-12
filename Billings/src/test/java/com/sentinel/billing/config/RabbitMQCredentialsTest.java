package com.sentinel.billing.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * C5: Verifies RabbitMQ credentials use sentinel/sentinel123, not guest/guest.
 *
 * Default application.properties had guest/guest (WRONG).
 * Docker and local profiles already had correct sentinel/sentinel123.
 *
 * RED phase: Default profile assertions should FAIL (currently guest/guest).
 */
@SpringBootTest
class RabbitMQCredentialsTest {

    @Value("${spring.rabbitmq.username}")
    private String rabbitmqUsername;

    @Value("${spring.rabbitmq.password}")
    private String rabbitmqPassword;

    @Test
    void rabbitmqUsernameShouldBeSentinel() {
        assertEquals("sentinel", rabbitmqUsername,
                "RabbitMQ username must be 'sentinel', not 'guest'");
    }

    @Test
    void rabbitmqPasswordShouldBeSentinel123() {
        assertEquals("sentinel123", rabbitmqPassword,
                "RabbitMQ password must be 'sentinel123', not 'guest'");
    }
}

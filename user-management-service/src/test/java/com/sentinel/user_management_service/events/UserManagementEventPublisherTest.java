package com.sentinel.user_management_service.events;

import com.sentinel.user_management_service.entity.InvitationEntity;
import com.sentinel.user_management_service.enums.InvitationType;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class UserManagementEventPublisherTest {

    @Test
    @SuppressWarnings("unchecked")
    void invitationUrlUsesConfiguredBaseUrl() {
        AtomicReference<Object> sent = new AtomicReference<>();
        RabbitTemplate rabbitTemplate = new RabbitTemplate() {
            @Override
            public void convertAndSend(String exchange, String routingKey, Object message) {
                sent.set(message);
            }
        };
        UserManagementEventPublisher publisher = new UserManagementEventPublisher(rabbitTemplate);
        ReflectionTestUtils.setField(publisher, "exchange", "user_mgmt_exchange");
        ReflectionTestUtils.setField(publisher, "userInvitedKey", "user.invited");
        ReflectionTestUtils.setField(publisher, "invitationBaseUrl", "https://sentinel.example.com/invitations/accept");

        InvitationEntity invitation = InvitationEntity.builder()
                .id(UUID.randomUUID())
                .email("invitee@example.com")
                .token("abc123")
                .type(InvitationType.TENANT)
                .resourceId(UUID.randomUUID())
                .resourceName("Acme")
                .role("MEMBER")
                .inviterEmail("owner@example.com")
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();

        publisher.publishUserInvited(invitation);

        Map<String, Object> data = (Map<String, Object>) ((Map<String, Object>) sent.get()).get("data");
        assertThat(data.get("invitationUrl"))
                .isEqualTo("https://sentinel.example.com/invitations/accept?token=abc123");
    }
}

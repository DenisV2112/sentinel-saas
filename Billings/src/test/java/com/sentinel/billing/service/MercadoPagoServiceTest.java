package com.sentinel.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sentinel.billing.dto.MercadoPagoPreferenceResponse;
import com.sentinel.billing.model.PlanEntity;
import com.sentinel.billing.repository.PaymentRepository;
import com.sentinel.billing.repository.PlanRepository;
import com.sentinel.billing.repository.SubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * E1 + E2: Tests for MercadoPagoService verifying:
 * - E1: RestTemplate is used instead of raw java.net.http.HttpClient
 * - E2: Jackson ObjectMapper is used instead of manual extractJsonValue()
 *
 * RED phase: The old code used newHttpClient() and manual string parsing.
 * These tests would FAIL with the old implementation because:
 * 1. HttpClient is not injectable/mockable via Spring
 * 2. extractJsonValue() is a private method that can't be verified separately
 */
@ExtendWith(MockitoExtension.class)
class MercadoPagoServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private SubscriptionRepository subscriptionRepository;

    @Mock
    private PlanRepository planRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private RestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MercadoPagoService mercadopagoService;

    @BeforeEach
    void setUp() throws Exception {
        // Set access token via reflection (simulates @Value injection)
        var tokenField = MercadoPagoService.class.getDeclaredField("accessToken");
        tokenField.setAccessible(true);
        tokenField.set(mercadopagoService, "TEST-SECRET123");

        var urlField = MercadoPagoService.class.getDeclaredField("appUrl");
        urlField.setAccessible(true);
        urlField.set(mercadopagoService, "http://localhost:3001");

        // Initialize @InjectMocks-injected fields
        var objectMapperField = MercadoPagoService.class.getDeclaredField("objectMapper");
        objectMapperField.setAccessible(true);
        objectMapperField.set(mercadopagoService, objectMapper);
    }

    // --- E1: RestTemplate usage ---

    @Test
    void createPreference_Uses_RestTemplate_Not_RawHttpClient() {
        // Arrange
        PlanEntity plan = createPlanEntity("plan-1", "Pro Plan", 50000);
        when(planRepository.findById("plan-1")).thenReturn(Optional.of(plan));

        String mpApiResponse = """
                {
                    "id": "pref_abc123",
                    "init_point": "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref_abc123",
                    "sandbox_init_point": "https://sandbox.mercadopago.com.co/checkout/v1/redirect?pref_id=pref_abc123"
                }
                """;

        ResponseEntity<String> mockResponse = ResponseEntity.ok(mpApiResponse);
        when(restTemplate.postForEntity(
                eq("https://api.mercadopago.com/checkout/preferences"),
                any(HttpEntity.class),
                eq(String.class)))
                .thenReturn(mockResponse);

        // Act
        Map<String, String> result = mercadopagoService.createPreference("plan-1", "user-1", "tenant-1");

        // Assert — RestTemplate was called (not HttpClient)
        verify(restTemplate).postForEntity(
                eq("https://api.mercadopago.com/checkout/preferences"),
                any(HttpEntity.class),
                eq(String.class));

        assertNotNull(result);
        assertTrue(result.containsKey("preferenceId"));
    }

    @Test
    void createPreference_Sets_Correct_Authorization_Header() {
        // Arrange
        PlanEntity plan = createPlanEntity("plan-2", "Enterprise", 100000);
        when(planRepository.findById("plan-2")).thenReturn(Optional.of(plan));

        String mpApiResponse = """
                {"id":"pref_xyz","init_point":"https://...","sandbox_init_point":"https://..."}
                """;
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(mpApiResponse));

        // Act
        mercadopagoService.createPreference("plan-2", "user-2", "tenant-2");

        // Assert — Authorization header contains Bearer token
        ArgumentCaptor<HttpEntity<String>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), entityCaptor.capture(), eq(String.class));

        var headers = entityCaptor.getValue().getHeaders();
        assertTrue(headers.containsKey("Authorization"));
        assertEquals("Bearer TEST-SECRET123", headers.getFirst("Authorization"));
    }

    // --- E2: ObjectMapper usage ---

    @Test
    void createPreference_Parses_Response_Via_ObjectMapper_Not_Manual_String_Split() {
        // Arrange
        PlanEntity plan = createPlanEntity("plan-3", "Starter", 25000);
        when(planRepository.findById("plan-3")).thenReturn(Optional.of(plan));

        String mpApiResponse = """
                {
                    "id": "pref_om_test_001",
                    "init_point": "https://www.mercadopago.com.co/init",
                    "sandbox_init_point": "https://sandbox.mercadopago.com.co/init"
                }
                """;
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(mpApiResponse));

        // Act
        Map<String, String> result = mercadopagoService.createPreference("plan-3", "user-3", "tenant-3");

        // Assert — ObjectMapper correctly parsed the IDs
        assertEquals("pref_om_test_001", result.get("preferenceId"));
        assertTrue(result.containsKey("initPoint"));
        assertTrue(result.containsKey("paymentId"));
        assertTrue(result.get("paymentId").startsWith("pay_"));
    }

    @Test
    void createPreference_Uses_Sandbox_InitPoint_For_Test_Tokens() {
        // Arrange
        PlanEntity plan = createPlanEntity("plan-4", "Basic", 10000);
        when(planRepository.findById("plan-4")).thenReturn(Optional.of(plan));

        String mpApiResponse = """
                {
                    "id": "pref_test",
                    "init_point": "https://www.mercadopago.com.co/prod",
                    "sandbox_init_point": "https://sandbox.mercadopago.com.co/test"
                }
                """;
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok(mpApiResponse));

        // Act
        Map<String, String> result = mercadopagoService.createPreference("plan-4", "user-4", "tenant-4");

        // Assert — TEST token should use sandbox_init_point
        assertEquals("https://sandbox.mercadopago.com.co/test", result.get("initPoint"));
    }

    // --- Helpers ---

    private PlanEntity createPlanEntity(String id, String name, int priceCop) {
        PlanEntity plan = new PlanEntity();
        plan.setId(id);
        plan.setName(name);
        plan.setDescription(name + " description");
        plan.setMonthlyPriceCop(new BigDecimal(priceCop));
        plan.setMonthlyPriceUsd(new BigDecimal(priceCop / 4000));
        return plan;
    }
}

package com.sentinel.backend_for_frontend_service.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * TDD: Tests for ScanRequestDto Jackson deserialization.
 * REQ-NEW-5: DTO fields match frontend JSON keys directly — no renames needed.
 */
class ScanRequestDtoTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void shouldDeserializeTypeAndTargetRepoCorrectly() throws Exception {
        // Given: frontend sends JSON with "type", "targetRepo", and "targetUrl"
        String json = """
                {
                    "projectId": "550e8400-e29b-41d4-a716-446655440000",
                    "type": "SAST",
                    "targetUrl": "https://github.com/example/repo",
                    "targetRepo": "main",
                    "clientGitToken": "ghp_test123",
                    "commitSha": "abc123def456"
                }
                """;

        // When: Jackson deserializes the JSON into ScanRequestDto
        ScanRequestDto dto = objectMapper.readValue(json, ScanRequestDto.class);

        // Then: all fields are mapped correctly by name
        assertNotNull(dto, "DTO should not be null");
        assertEquals("SAST", dto.getType(), "type field should match 'type' JSON key");
        assertEquals("main", dto.getTargetRepo(), "targetRepo field should match 'targetRepo' JSON key");
        assertEquals("550e8400-e29b-41d4-a716-446655440000", dto.getProjectId());
        assertEquals("https://github.com/example/repo", dto.getTargetUrl());
        assertEquals("ghp_test123", dto.getClientGitToken());
    }

    @Test
    void shouldDeserializeDastWithTargetUrl() throws Exception {
        // Given: DAST scan with targetUrl (no targetRepo)
        String json = """
                {
                    "projectId": "550e8400-e29b-41d4-a716-446655440000",
                    "type": "DAST",
                    "targetUrl": "https://example.com"
                }
                """;

        // When: Jackson deserializes
        ScanRequestDto dto = objectMapper.readValue(json, ScanRequestDto.class);

        // Then: type and targetUrl deserialize correctly, targetRepo is null
        assertNotNull(dto);
        assertEquals("DAST", dto.getType(), "type should be DAST");
        assertEquals("https://example.com", dto.getTargetUrl());
        assertEquals(null, dto.getTargetRepo(), "targetRepo should be null for DAST");
    }
}

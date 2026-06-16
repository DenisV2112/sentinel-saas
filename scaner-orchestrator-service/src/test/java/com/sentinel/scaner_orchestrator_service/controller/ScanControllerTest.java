package com.sentinel.scaner_orchestrator_service.controller;

import com.sentinel.scaner_orchestrator_service.dto.response.ScanResponseDTO;
import com.sentinel.scaner_orchestrator_service.security.jwt.JwtService;
import com.sentinel.scaner_orchestrator_service.service.ScanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * TDD: Tests for ScanController filter query params.
 * REQ-NEW-4: Orchestrator applies scan list filters (status, type, date range).
 */
@WebMvcTest(
    value = ScanController.class,
    excludeAutoConfiguration = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
    }
)
@AutoConfigureMockMvc(addFilters = false)
class ScanControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ScanService scanService;

    @MockitoBean
    private JwtService jwtService;

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    @Test
    void shouldPassStatusFilterToService() throws Exception {
        // Given: service returns empty page
        Page<ScanResponseDTO> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(scanService.getScans(any(UUID.class), any(), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        // When: GET with status filter
        mockMvc.perform(get("/api/scans")
                        .header("X-Tenant-Id", TENANT_ID.toString())
                        .param("page", "0")
                        .param("size", "10")
                        .param("status", "COMPLETED"))
                .andExpect(status().isOk());

        // Then: service was called with status=COMPLETED
        verify(scanService).getScans(
                eq(TENANT_ID),
                any(),
                eq("COMPLETED"),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    void shouldPassTypeFilterToService() throws Exception {
        Page<ScanResponseDTO> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(scanService.getScans(any(UUID.class), any(), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        mockMvc.perform(get("/api/scans")
                        .header("X-Tenant-Id", TENANT_ID.toString())
                        .param("page", "0")
                        .param("size", "10")
                        .param("type", "SAST"))
                .andExpect(status().isOk());

        verify(scanService).getScans(
                eq(TENANT_ID),
                any(),
                isNull(),
                eq("SAST"),
                isNull(),
                isNull()
        );
    }

    @Test
    void shouldPassDateRangeFiltersToService() throws Exception {
        Page<ScanResponseDTO> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(scanService.getScans(any(UUID.class), any(), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        mockMvc.perform(get("/api/scans")
                        .header("X-Tenant-Id", TENANT_ID.toString())
                        .param("page", "0")
                        .param("size", "10")
                        .param("startDate", "2026-01-01")
                        .param("endDate", "2026-06-01"))
                .andExpect(status().isOk());

        verify(scanService).getScans(
                eq(TENANT_ID),
                any(),
                isNull(),
                isNull(),
                eq("2026-01-01"),
                eq("2026-06-01")
        );
    }

    @Test
    void shouldWorkWithoutAnyFilters() throws Exception {
        Page<ScanResponseDTO> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(scanService.getScans(any(UUID.class), any(), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        mockMvc.perform(get("/api/scans")
                        .header("X-Tenant-Id", TENANT_ID.toString())
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk());

        // All filter params should be null when not provided
        verify(scanService).getScans(
                eq(TENANT_ID),
                any(),
                isNull(),
                isNull(),
                isNull(),
                isNull()
        );
    }

    @Test
    void shouldPassAllFiltersSimultaneously() throws Exception {
        Page<ScanResponseDTO> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(scanService.getScans(any(UUID.class), any(), any(), any(), any(), any()))
                .thenReturn(emptyPage);

        mockMvc.perform(get("/api/scans")
                        .header("X-Tenant-Id", TENANT_ID.toString())
                        .param("page", "0")
                        .param("size", "10")
                        .param("status", "FAILED")
                        .param("type", "DAST")
                        .param("startDate", "2026-03-01")
                        .param("endDate", "2026-03-31"))
                .andExpect(status().isOk());

        verify(scanService).getScans(
                eq(TENANT_ID),
                any(),
                eq("FAILED"),
                eq("DAST"),
                eq("2026-03-01"),
                eq("2026-03-31")
        );
    }
}

package com.sentinel.user_management_service.service;

import com.sentinel.user_management_service.repository.ProjectMemberRepository;
import com.sentinel.user_management_service.repository.TenantMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final TenantMemberRepository tenantMemberRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public boolean checkPermission(UUID userId, UUID tenantId, UUID projectId, String permission) {
        return switch (permission) {
            case "MANAGE_TENANT" -> canManageTenant(userId, tenantId);
            case "MANAGE_PROJECT" -> canManageProject(userId, projectId);
            case "CREATE_SCANS" -> canCreateScans(userId, projectId);
            case "VIEW_SCANS" -> canViewScans(userId, projectId);
            default -> false;
        };
    }

    public boolean canManageTenant(UUID userId, UUID tenantId) {
        return tenantMemberRepository.findByTenantIdAndUserId(tenantId, userId)
                .map(member -> member.isAdmin())
                .orElse(false);
    }

    public boolean canManageProject(UUID userId, UUID projectId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(member -> member.isAdmin())
                .orElse(false);
    }

    public boolean canCreateScans(UUID userId, UUID projectId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(member -> member.canCreateScans())
                .orElse(false);
    }

    public boolean canViewScans(UUID userId, UUID projectId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(member -> member.canViewResults())
                .orElse(false);
    }

    public String getTenantRole(UUID tenantId, UUID userId) {
        return tenantMemberRepository.findByTenantIdAndUserId(tenantId, userId)
                .map(member -> member.getRole().name())
                .orElse(null);
    }

    public String getProjectRole(UUID projectId, UUID userId) {
        return projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(member -> member.getRole().name())
                .orElse(null);
    }
}

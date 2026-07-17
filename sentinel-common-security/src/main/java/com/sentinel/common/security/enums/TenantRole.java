package com.sentinel.common.security.enums;

/**
 * Roles a nivel de tenant (organización/workspace).
 * Define los permisos del usuario dentro de un tenant específico.
 */
public enum TenantRole {
    /**
     * Administrador del tenant.
     * Puede gestionar miembros, configuración, billing.
     */
    TENANT_ADMIN,

    /**
     * Usuario regular del tenant.
     * Puede crear y gestionar proyectos.
     */
    TENANT_USER,

    /**
     * Usuario de solo lectura (futuro).
     */
    TENANT_VIEWER
}

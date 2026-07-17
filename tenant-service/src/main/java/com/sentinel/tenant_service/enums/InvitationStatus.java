
package com.sentinel.tenant_service.enums;

/**
 * Estados de una invitación a tenant.
 */
/**
 * Estados de una invitación a tenant.
 *
 * NOTA: NO se movió a sentinel-common-security porque user-management-service
 * usa un modelo incompatible (REVOKED en lugar de REJECTED/CANCELLED).
 * Mantener sincronizado manualmente si cambia el modelo de invitaciones.
 */
public enum InvitationStatus {
    /**
     * Invitación enviada, esperando respuesta.
     */
    PENDING,
    
    /**
     * Invitación aceptada por el usuario.
     */
    ACCEPTED,
    
    /**
     * Invitación rechazada por el usuario.
     */
    REJECTED,
    
    /**
     * Invitación cancelada por el invitador.
     */
    CANCELLED,
    
    /**
     * Invitación expirada (sin respuesta).
     */
    EXPIRED
}
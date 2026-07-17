package com.sentinel.user_management_service.enums;

/**
 * Estados de una invitación.
 *
 * NOTA: NO se movió a sentinel-common-security porque tenant-service
 * usa un modelo incompatible (REJECTED/CANCELLED en lugar de REVOKED).
 * Mantener sincronizado manualmente si cambia el modelo de invitaciones.
 */
public enum InvitationStatus {
    PENDING,
    ACCEPTED,
    EXPIRED,
    REVOKED
}

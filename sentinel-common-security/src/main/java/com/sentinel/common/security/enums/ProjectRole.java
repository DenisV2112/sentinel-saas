package com.sentinel.common.security.enums;

/**
 * Roles a nivel de proyecto.
 * Define los permisos del usuario dentro de un proyecto específico.
 */
public enum ProjectRole {
    /**
     * Administrador del proyecto.
     * Control total sobre el proyecto y sus scans.
     */
    PROJECT_ADMIN,

    /**
     * Miembro del proyecto.
     * Puede crear y visualizar scans del proyecto.
     */
    PROJECT_MEMBER,

    /**
     * Visualizador del proyecto (solo lectura).
     */
    PROJECT_VIEWER
}

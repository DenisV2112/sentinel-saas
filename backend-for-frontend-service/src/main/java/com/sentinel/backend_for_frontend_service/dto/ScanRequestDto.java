package com.sentinel.backend_for_frontend_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanRequestDto {
    private String projectId;
    private String type;
    private String targetUrl;
    private String targetRepo;
    private String clientGitToken;
    private String commitSha;
}

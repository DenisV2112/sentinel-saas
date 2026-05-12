package com.sentinel.billing.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * E2: DTO for MercadoPago checkout/preferences API response.
 * Replaces fragile manual extractJsonValue() string parsing
 * with proper Jackson deserialization.
 *
 * API returns many more fields (items, payer, back_urls, etc.)
 * but we only need these three to build the checkout response.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class MercadoPagoPreferenceResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("init_point")
    private String initPoint;

    @JsonProperty("sandbox_init_point")
    private String sandboxInitPoint;
}

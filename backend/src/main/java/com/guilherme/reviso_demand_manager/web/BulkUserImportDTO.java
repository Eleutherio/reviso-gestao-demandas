package com.guilherme.reviso_demand_manager.web;

import jakarta.validation.constraints.NotBlank;

public record BulkUserImportDTO(
    @NotBlank(message = "CSV e obrigatorio")
    String csv
) {
}

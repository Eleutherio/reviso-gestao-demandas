package com.guilherme.reviso_demand_manager.web;

import java.util.List;

public record BulkUserImportResultDTO(
    int created,
    List<BulkUserImportErrorDTO> errors
) {
}

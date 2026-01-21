package com.guilherme.reviso_demand_manager.web;

public record BulkUserImportErrorDTO(
    int line,
    String message
) {
}

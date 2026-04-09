package com.guilherme.reviso_demand_manager.web;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AgencyDTO(
    UUID id,
    String name,
    Boolean active,
    String databaseName,
    OffsetDateTime createdAt
) {
}

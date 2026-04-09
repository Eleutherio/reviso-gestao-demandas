package com.guilherme.reviso_demand_manager.web;

import java.util.UUID;

public record AccessProfileDTO(
        UUID id,
        String name,
        String description,
        Boolean isDefault
) {
}

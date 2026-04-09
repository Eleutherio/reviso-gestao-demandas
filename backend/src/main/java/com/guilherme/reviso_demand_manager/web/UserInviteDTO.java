package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.domain.InviteStatus;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import java.time.OffsetDateTime;
import java.util.UUID;

public record UserInviteDTO(
    UUID id,
    String fullName,
    String email,
    UserRole role,
    InviteStatus status,
    OffsetDateTime expiresAt,
    OffsetDateTime createdAt
) {
}

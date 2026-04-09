package com.guilherme.reviso_demand_manager.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateAgencyUserInviteDTO(
    @NotBlank(message = "Nome completo e obrigatorio")
    String fullName,

    @NotBlank(message = "Email e obrigatorio")
    @Email(message = "Email invalido")
    String email,

    @NotNull(message = "accessProfileId e obrigatorio")
    UUID accessProfileId
) {
}

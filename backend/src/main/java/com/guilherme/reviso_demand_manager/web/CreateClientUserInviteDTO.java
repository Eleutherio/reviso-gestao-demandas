package com.guilherme.reviso_demand_manager.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateClientUserInviteDTO(
    @NotBlank(message = "Nome completo e obrigatorio")
    String fullName,

    @NotBlank(message = "Email e obrigatorio")
    @Email(message = "Email invalido")
    String email,

    UUID companyId,
    String companyCode
) {
}

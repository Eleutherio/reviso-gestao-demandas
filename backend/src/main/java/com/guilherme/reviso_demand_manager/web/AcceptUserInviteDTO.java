package com.guilherme.reviso_demand_manager.web;

import jakarta.validation.constraints.NotBlank;

public record AcceptUserInviteDTO(
    @NotBlank(message = "Token e obrigatorio")
    String token,

    @NotBlank(message = "Senha e obrigatoria")
    String password
) {
}

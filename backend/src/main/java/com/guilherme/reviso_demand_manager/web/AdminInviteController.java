package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.UserInviteService;
import com.guilherme.reviso_demand_manager.infra.JwtAuthFilter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/invites")
public class AdminInviteController {

    private final UserInviteService userInviteService;

    public AdminInviteController(UserInviteService userInviteService) {
        this.userInviteService = userInviteService;
    }

    @PostMapping("/agency-users")
    public ResponseEntity<UserInviteDTO> inviteAgencyUser(
            @Valid @RequestBody CreateAgencyUserInviteDTO dto,
            Authentication authentication) {
        UUID agencyId = requireAgencyId(authentication);
        UserInviteDTO created = userInviteService.createAgencyUserInvite(dto, agencyId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/client-users")
    public ResponseEntity<UserInviteDTO> inviteClientUser(
            @Valid @RequestBody CreateClientUserInviteDTO dto,
            Authentication authentication) {
        UUID agencyId = requireAgencyId(authentication);
        UserInviteDTO created = userInviteService.createClientUserInvite(dto, agencyId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<UserInviteDTO> cancelInvite(
            @PathVariable UUID id,
            Authentication authentication) {
        UUID agencyId = requireAgencyId(authentication);
        UserInviteDTO canceled = userInviteService.cancelInvite(id, agencyId);
        return ResponseEntity.ok(canceled);
    }

    private UUID requireAgencyId(Authentication authentication) {
        JwtAuthFilter.AuthenticatedUser user = (JwtAuthFilter.AuthenticatedUser) authentication.getPrincipal();
        if (user == null || user.agencyId() == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        return user.agencyId();
    }
}

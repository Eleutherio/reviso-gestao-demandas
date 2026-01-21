package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.UserInviteService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/invites")
public class InviteController {

    private final UserInviteService userInviteService;

    public InviteController(UserInviteService userInviteService) {
        this.userInviteService = userInviteService;
    }

    @PostMapping("/accept")
    public ResponseEntity<Map<String, Object>> acceptInvite(@Valid @RequestBody AcceptUserInviteDTO dto) {
        userInviteService.acceptInvite(dto);
        return ResponseEntity.ok(Map.of(
                "status", 200,
                "message", "Convite aceito com sucesso"
        ));
    }
}

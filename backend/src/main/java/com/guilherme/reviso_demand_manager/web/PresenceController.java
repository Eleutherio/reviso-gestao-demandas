package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.infra.JwtAuthFilter;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/presence")
public class PresenceController {

    private final UserRepository userRepository;

    public PresenceController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/ping")
    public ResponseEntity<Void> ping(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof JwtAuthFilter.AuthenticatedUser user)) {
            return ResponseEntity.status(401).build();
        }

        UUID userId = user.id();
        User entity = userRepository.findById(userId).orElse(null);
        if (entity == null) {
            return ResponseEntity.notFound().build();
        }

        entity.setLastSeenAt(OffsetDateTime.now());
        userRepository.save(entity);
        return ResponseEntity.ok().build();
    }
}

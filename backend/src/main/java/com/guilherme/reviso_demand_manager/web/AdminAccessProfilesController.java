package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.AccessProfileService;
import com.guilherme.reviso_demand_manager.infra.AccessProfileRepository;
import com.guilherme.reviso_demand_manager.infra.JwtAuthFilter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/admin/access-profiles")
public class AdminAccessProfilesController {

    private final AccessProfileRepository accessProfileRepository;
    private final AccessProfileService accessProfileService;

    public AdminAccessProfilesController(
            AccessProfileRepository accessProfileRepository,
            AccessProfileService accessProfileService) {
        this.accessProfileRepository = accessProfileRepository;
        this.accessProfileService = accessProfileService;
    }

    @GetMapping
    public ResponseEntity<List<AccessProfileDTO>> listAccessProfiles(Authentication authentication) {
        UUID agencyId = requireAgencyId(authentication);
        accessProfileService.ensureDefaultProfile(agencyId);
        List<AccessProfileDTO> profiles = accessProfileRepository.findByAgencyIdOrderByNameAsc(agencyId)
                .stream()
                .map(profile -> new AccessProfileDTO(
                        profile.getId(),
                        profile.getName(),
                        profile.getDescription(),
                        profile.getIsDefault()
                ))
                .toList();
        return ResponseEntity.ok(profiles);
    }

    private UUID requireAgencyId(Authentication authentication) {
        JwtAuthFilter.AuthenticatedUser user = (JwtAuthFilter.AuthenticatedUser) authentication.getPrincipal();
        if (user == null || user.agencyId() == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        return user.agencyId();
    }
}

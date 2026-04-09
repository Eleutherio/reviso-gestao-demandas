package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.UserBulkImportService;
import com.guilherme.reviso_demand_manager.infra.JwtAuthFilter;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/admin/users/bulk")
public class AdminBulkUserController {

    private final UserBulkImportService bulkImportService;

    public AdminBulkUserController(UserBulkImportService bulkImportService) {
        this.bulkImportService = bulkImportService;
    }

    @PostMapping("/agency")
    public ResponseEntity<BulkUserImportResultDTO> importAgencyUsers(
            @Valid @RequestBody BulkUserImportDTO dto,
            Authentication authentication) {
        UUID agencyId = requireAgencyId(authentication);
        return ResponseEntity.ok(bulkImportService.importAgencyUsers(dto.csv(), agencyId));
    }

    @PostMapping("/client")
    public ResponseEntity<BulkUserImportResultDTO> importClientUsers(
            @Valid @RequestBody BulkUserImportDTO dto,
            Authentication authentication) {
        UUID agencyId = requireAgencyId(authentication);
        return ResponseEntity.ok(bulkImportService.importClientUsers(dto.csv(), agencyId));
    }

    private UUID requireAgencyId(Authentication authentication) {
        JwtAuthFilter.AuthenticatedUser user = (JwtAuthFilter.AuthenticatedUser) authentication.getPrincipal();
        if (user == null || user.agencyId() == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        return user.agencyId();
    }
}

package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.TenantProvisioningService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/platform/tenants")
@ConditionalOnProperty(prefix = "features", name = "multi-db-provisioning", havingValue = "true")
public class PlatformTenantController {

    private final TenantProvisioningService tenantProvisioningService;

    public PlatformTenantController(TenantProvisioningService tenantProvisioningService) {
        this.tenantProvisioningService = tenantProvisioningService;
    }

    @PostMapping("/{agencyId}/provision")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    public ResponseEntity<Map<String, String>> provisionTenant(@PathVariable UUID agencyId) {
        tenantProvisioningService.provisionTenant(agencyId);
        return ResponseEntity.ok(Map.of("message", "Tenant provisioned successfully"));
    }
}

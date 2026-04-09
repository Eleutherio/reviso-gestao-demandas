package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.AccessProfile;
import com.guilherme.reviso_demand_manager.infra.AccessProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AccessProfileService {

    private final AccessProfileRepository accessProfileRepository;

    public AccessProfileService(AccessProfileRepository accessProfileRepository) {
        this.accessProfileRepository = accessProfileRepository;
    }

    @Transactional
    public AccessProfile ensureDefaultProfile(UUID agencyId) {
        Map<String, AccessProfile> byName = loadProfiles(agencyId);
        AccessProfile gestor = ensureGestorProfile(agencyId, byName);
        ensureProfile(byName, agencyId, "Atendimento", "Perfil de atendimento", false);
        ensureProfile(byName, agencyId, "Criacao", "Perfil de criacao", false);
        if (!Boolean.TRUE.equals(gestor.getIsDefault())) {
            gestor.setIsDefault(true);
            gestor = accessProfileRepository.save(gestor);
        }
        return gestor;
    }

    private Map<String, AccessProfile> loadProfiles(UUID agencyId) {
        List<AccessProfile> profiles = accessProfileRepository.findByAgencyIdOrderByNameAsc(agencyId);
        Map<String, AccessProfile> byName = new HashMap<>();
        for (AccessProfile profile : profiles) {
            byName.put(normalizeName(profile.getName()), profile);
        }
        return byName;
    }

    private AccessProfile ensureGestorProfile(UUID agencyId, Map<String, AccessProfile> byName) {
        AccessProfile gestor = byName.get(normalizeName("Gestor"));
        AccessProfile gestao = byName.get(normalizeName("Gestao"));
        if (gestor == null && gestao != null) {
            gestao.setName("Gestor");
            gestao.setDescription("Perfil gestor da agencia");
            gestao.setIsDefault(true);
            gestor = accessProfileRepository.save(gestao);
            byName.put(normalizeName("Gestor"), gestor);
            byName.remove(normalizeName("Gestao"));
        }
        if (gestor == null) {
            gestor = ensureProfile(byName, agencyId, "Gestor", "Perfil gestor da agencia", true);
        }
        return gestor;
    }

    private AccessProfile ensureProfile(Map<String, AccessProfile> byName,
                                        UUID agencyId,
                                        String name,
                                        String description,
                                        boolean isDefault) {
        String key = normalizeName(name);
        AccessProfile existing = byName.get(key);
        if (existing != null) {
            return existing;
        }
        AccessProfile profile = new AccessProfile();
        profile.setId(UUID.randomUUID());
        profile.setAgencyId(agencyId);
        profile.setName(name);
        profile.setDescription(description);
        profile.setIsDefault(isDefault);
        AccessProfile saved = accessProfileRepository.save(profile);
        byName.put(key, saved);
        return saved;
    }

    private String normalizeName(String name) {
        if (name == null) {
            return "";
        }
        return name.trim().toLowerCase();
    }
}

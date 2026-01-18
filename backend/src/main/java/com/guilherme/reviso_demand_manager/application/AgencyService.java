package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.Agency;
import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.infra.AgencyRepository;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import com.guilherme.reviso_demand_manager.web.AgencyDTO;
import com.guilherme.reviso_demand_manager.web.CreateAgencyDTO;
import com.guilherme.reviso_demand_manager.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AgencyService {

    private final AgencyRepository agencyRepository;
    private final UserRepository userRepository;

    public AgencyService(AgencyRepository agencyRepository, UserRepository userRepository) {
        this.agencyRepository = agencyRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public AgencyDTO createAgency(CreateAgencyDTO dto, UUID adminUserId) {
        User user = userRepository.findById(adminUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        if (user.getAgencyId() != null) {
            throw new IllegalStateException("Usuario ja vinculado a uma agencia");
        }

        Agency agency = new Agency();
        agency.setId(UUID.randomUUID());
        agency.setName(dto.name());
        agency.setActive(true);
        agency.setCreatedAt(OffsetDateTime.now());

        Agency saved = agencyRepository.save(agency);
        user.setAgencyId(saved.getId());
        userRepository.save(user);

        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public AgencyDTO getAgency(UUID agencyId) {
        Agency agency = agencyRepository.findById(agencyId)
            .orElseThrow(() -> new ResourceNotFoundException("Agencia nao encontrada"));
        return toDTO(agency);
    }

    private AgencyDTO toDTO(Agency agency) {
        return new AgencyDTO(
            agency.getId(),
            agency.getName(),
            agency.getActive(),
            agency.getDatabaseName(),
            agency.getCreatedAt()
        );
    }
}

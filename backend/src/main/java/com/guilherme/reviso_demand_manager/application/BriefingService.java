package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.Briefing;
import com.guilherme.reviso_demand_manager.domain.AgencyDepartment;
import com.guilherme.reviso_demand_manager.domain.Company;
import com.guilherme.reviso_demand_manager.domain.Request;
import com.guilherme.reviso_demand_manager.domain.RequestPriority;
import com.guilherme.reviso_demand_manager.domain.RequestStatus;
import com.guilherme.reviso_demand_manager.domain.RequestType;
import com.guilherme.reviso_demand_manager.infra.BriefingRepository;
import com.guilherme.reviso_demand_manager.infra.CompanyRepository;
import com.guilherme.reviso_demand_manager.infra.RequestRepository;
import com.guilherme.reviso_demand_manager.web.BriefingDTO;
import com.guilherme.reviso_demand_manager.web.CreateBriefingDTO;
import com.guilherme.reviso_demand_manager.web.RequestDTO;
import com.guilherme.reviso_demand_manager.web.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class BriefingService {

    private final BriefingRepository briefingRepository;
    private final RequestRepository requestRepository;
    private final CompanyRepository companyRepository;

    public BriefingService(
            BriefingRepository briefingRepository,
            RequestRepository requestRepository,
            CompanyRepository companyRepository) {
        this.briefingRepository = briefingRepository;
        this.requestRepository = requestRepository;
        this.companyRepository = companyRepository;
    }

    @Transactional
    public BriefingDTO createBriefing(CreateBriefingDTO dto, UUID companyId, UUID userId, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        Company company = resolveCompany(companyId, agencyId);
        Briefing briefing = new Briefing();
        briefing.setId(UUID.randomUUID());
        briefing.setAgencyId(company.getAgencyId());
        briefing.setCompanyId(company.getId());
        briefing.setCreatedByUserId(userId);
        briefing.setTitle(dto.title());
        briefing.setDescription(dto.description());
        briefing.setStatus("PENDING");
        briefing.setCreatedAt(OffsetDateTime.now());

        Briefing saved = briefingRepository.save(briefing);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<BriefingDTO> listMyBriefings(UUID companyId, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        return briefingRepository.findByCompanyIdAndAgencyIdOrderByCreatedAtDesc(companyId, agencyId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BriefingDTO> listBriefingsByStatus(String status, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        if (status != null && !status.isBlank()) {
            return briefingRepository.findByAgencyIdAndStatusOrderByCreatedAtDesc(agencyId, status).stream()
                    .map(this::toDTO)
                    .toList();
        }
        return briefingRepository.findByAgencyIdOrderByCreatedAtDesc(agencyId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RequestDTO> listMyRequests(UUID companyId, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        return requestRepository.findByCompanyIdAndAgencyIdOrderByCreatedAtDesc(companyId, agencyId).stream()
                .map(this::toRequestDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public RequestDTO getRequestById(UUID requestId, UUID companyId, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        Request request = requestRepository.findByIdAndAgencyId(requestId, agencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Demanda nao encontrada"));

        if (!request.getCompanyId().equals(companyId)) {
            throw new ResourceNotFoundException("Demanda nao encontrada");
        }

        return toRequestDTO(request);
    }

    @Transactional
    public RequestDTO convertBriefingToRequest(UUID briefingId, AgencyDepartment department, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        Briefing briefing = briefingRepository.findByIdAndAgencyId(briefingId, agencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Briefing nao encontrado"));


        if (department == null) {
            throw new IllegalArgumentException("Departamento Ã© obrigatÃ³rio");
        }

        if (!"PENDING".equals(briefing.getStatus())) {
            throw new IllegalStateException("Apenas briefings PENDING podem ser convertidos");
        }

        // Cria request a partir do briefing
        Request request = new Request();
        request.setId(UUID.randomUUID());
        request.setAgencyId(briefing.getAgencyId());
        request.setCompanyId(briefing.getCompanyId());
        request.setBriefingId(briefing.getId());
        request.setTitle(briefing.getTitle());
        request.setDescription(briefing.getDescription());
        request.setType(RequestType.OTHER);
        request.setPriority(RequestPriority.MEDIUM);
        request.setDepartment(department);
        request.setStatus(RequestStatus.NEW);
        request.setRevisionCount(0);
        request.setCreatedAt(OffsetDateTime.now());
        request.setUpdatedAt(OffsetDateTime.now());

        Request saved = requestRepository.save(request);

        // Atualiza status do briefing
        briefing.setStatus("CONVERTED");
        briefingRepository.save(briefing);

        return toRequestDTO(saved);
    }

    @Transactional
    public void rejectBriefing(UUID briefingId, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        Briefing briefing = briefingRepository.findByIdAndAgencyId(briefingId, agencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Briefing nao encontrado"));


        if (!"PENDING".equals(briefing.getStatus())) {
            throw new IllegalStateException("Apenas briefings PENDING podem ser rejeitados");
        }

        briefing.setStatus("REJECTED");
        briefingRepository.save(briefing);
    }

    private BriefingDTO toDTO(Briefing briefing) {
        return new BriefingDTO(
                briefing.getId(),
                briefing.getAgencyId(),
                briefing.getCompanyId(),
                resolveCompanyName(briefing.getCompanyId(), briefing.getAgencyId()),
                briefing.getCreatedByUserId(),
                briefing.getTitle(),
                briefing.getDescription(),
                briefing.getStatus(),
                briefing.getCreatedAt()
        );
    }

    private RequestDTO toRequestDTO(Request request) {
        return new RequestDTO(
                request.getId(),
                request.getAgencyId(),
                request.getCompanyId(),
                resolveCompanyName(request.getCompanyId(), request.getAgencyId()),
                request.getBriefingId(),
                request.getTitle(),
                request.getDescription(),
                request.getType(),
                request.getPriority(),
                request.getDepartment(),
                request.getStatus(),
                request.getAssigneeId(),
                request.getDueDate(),
                request.getRevisionCount(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }

    private Company resolveCompany(UUID companyId, UUID agencyId) {
        return companyRepository.findByIdAndAgencyId(companyId, agencyId)
                .orElseThrow(() -> new IllegalArgumentException("Empresa nao encontrada"));
    }

    private String resolveCompanyName(UUID companyId, UUID agencyId) {
        if (companyId == null || agencyId == null) {
            return null;
        }
        return companyRepository.findByIdAndAgencyId(companyId, agencyId)
                .map(Company::getName)
                .orElse(null);
    }
}









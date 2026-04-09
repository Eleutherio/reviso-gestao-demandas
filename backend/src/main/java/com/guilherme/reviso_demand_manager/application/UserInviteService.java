package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.InviteStatus;
import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.domain.UserInvite;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import com.guilherme.reviso_demand_manager.infra.AccessProfileRepository;
import com.guilherme.reviso_demand_manager.infra.CompanyRepository;
import com.guilherme.reviso_demand_manager.infra.EmailMessage;
import com.guilherme.reviso_demand_manager.infra.UserInviteRepository;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import com.guilherme.reviso_demand_manager.web.AcceptUserInviteDTO;
import com.guilherme.reviso_demand_manager.web.CreateAgencyUserInviteDTO;
import com.guilherme.reviso_demand_manager.web.CreateClientUserInviteDTO;
import com.guilherme.reviso_demand_manager.web.ResourceNotFoundException;
import com.guilherme.reviso_demand_manager.web.UserInviteDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserInviteService {

    private final UserInviteRepository inviteRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final AccessProfileRepository accessProfileRepository;
    private final EmailOutboxService emailOutboxService;
    private final PasswordEncoder passwordEncoder;
    private final String frontendBaseUrl;
    private final long inviteTtlHours;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserInviteService(
            UserInviteRepository inviteRepository,
            UserRepository userRepository,
            CompanyRepository companyRepository,
            AccessProfileRepository accessProfileRepository,
            EmailOutboxService emailOutboxService,
            PasswordEncoder passwordEncoder,
            @Value("${user-invites.ttl-hours:72}") long inviteTtlHours,
            @Value("${frontend.base-url}") String frontendBaseUrl
    ) {
        this.inviteRepository = inviteRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.accessProfileRepository = accessProfileRepository;
        this.emailOutboxService = emailOutboxService;
        this.passwordEncoder = passwordEncoder;
        this.inviteTtlHours = inviteTtlHours;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public UserInviteDTO createAgencyUserInvite(CreateAgencyUserInviteDTO dto, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        String email = normalizeEmail(dto.email());
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email ja esta em uso");
        }
        accessProfileRepository.findByIdAndAgencyId(dto.accessProfileId(), agencyId)
                .orElseThrow(() -> new IllegalArgumentException("Perfil de acesso invalido"));

        String token = generateUniqueToken();
        UserInvite invite = buildInvite(
                token,
                dto.fullName(),
                email,
                UserRole.AGENCY_USER,
                agencyId,
                null,
                dto.accessProfileId()
        );
        inviteRepository.save(invite);

        String link = buildInviteLink(token, "agency");
        EmailMessage message = new EmailMessage(
                email,
                "Convite para acessar a agencia",
                buildInviteEmailBody(dto.fullName(), link, "agencia")
        );
        emailOutboxService.enqueueAndSend(message);
        return toDTO(invite);
    }

    @Transactional
    public UserInviteDTO createClientUserInvite(CreateClientUserInviteDTO dto, UUID agencyId) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        String email = normalizeEmail(dto.email());
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("Email ja esta em uso");
        }

        var company = resolveCompany(dto, agencyId);
        String token = generateUniqueToken();
        UserInvite invite = buildInvite(
                token,
                dto.fullName(),
                email,
                UserRole.CLIENT_USER,
                agencyId,
                company.getId(),
                null
        );
        inviteRepository.save(invite);

        String link = buildInviteLink(token, "client");
        EmailMessage message = new EmailMessage(
                email,
                "Convite para acessar o portal do cliente",
                buildInviteEmailBody(dto.fullName(), link, "portal do cliente")
        );
        emailOutboxService.enqueueAndSend(message);
        return toDTO(invite);
    }

    @Transactional
    public UserInviteDTO cancelInvite(UUID inviteId, UUID agencyId) {
        UserInvite invite = inviteRepository.findByIdAndAgencyId(inviteId, agencyId)
                .orElseThrow(() -> new ResourceNotFoundException("Convite nao encontrado"));
        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new IllegalStateException("Convite nao pode ser cancelado");
        }
        invite.setStatus(InviteStatus.CANCELED);
        invite.setUpdatedAt(now());
        return toDTO(inviteRepository.save(invite));
    }

    @Transactional
    public void acceptInvite(AcceptUserInviteDTO dto) {
        String token = normalizeToken(dto.token());
        if (token.isBlank()) {
            throw new IllegalArgumentException("Token invalido");
        }
        UserInvite invite = inviteRepository.findByTokenHash(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Token invalido ou expirado"));

        if (invite.getStatus() != InviteStatus.PENDING) {
            throw new IllegalArgumentException("Token invalido ou expirado");
        }

        OffsetDateTime now = now();
        if (invite.getExpiresAt().isBefore(now)) {
            invite.setStatus(InviteStatus.EXPIRED);
            invite.setUpdatedAt(now);
            inviteRepository.save(invite);
            throw new IllegalArgumentException("Token invalido ou expirado");
        }

        String email = normalizeEmail(invite.getEmail());
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalStateException("Email ja esta em uso");
        }

        if (invite.getRole() == UserRole.CLIENT_USER && invite.getCompanyId() == null) {
            throw new IllegalStateException("Convite sem companyId");
        }
        if (invite.getRole() != UserRole.CLIENT_USER && invite.getAccessProfileId() == null) {
            throw new IllegalStateException("Convite sem accessProfileId");
        }
        if (invite.getRole() == UserRole.CLIENT_USER && invite.getAccessProfileId() != null) {
            throw new IllegalStateException("Convite invalido");
        }

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName(invite.getFullName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(dto.password()));
        user.setRole(invite.getRole());
        user.setAgencyId(invite.getAgencyId());
        user.setCompanyId(invite.getCompanyId());
        user.setAccessProfileId(invite.getAccessProfileId());
        user.setActive(true);
        user.setCreatedAt(now);
        userRepository.save(user);

        invite.setStatus(InviteStatus.ACCEPTED);
        invite.setAcceptedAt(now);
        invite.setUpdatedAt(now);
        inviteRepository.save(invite);
    }

    private UserInvite buildInvite(String token,
                                   String fullName,
                                   String email,
                                   UserRole role,
                                   UUID agencyId,
                                   UUID companyId,
                                   UUID accessProfileId) {
        OffsetDateTime now = now();
        UserInvite invite = new UserInvite();
        invite.setId(UUID.randomUUID());
        invite.setTokenHash(hashToken(token));
        invite.setFullName(fullName);
        invite.setEmail(email);
        invite.setRole(role);
        invite.setAgencyId(agencyId);
        invite.setCompanyId(companyId);
        invite.setAccessProfileId(accessProfileId);
        invite.setStatus(InviteStatus.PENDING);
        invite.setExpiresAt(now.plusHours(inviteTtlHours));
        invite.setCreatedAt(now);
        invite.setUpdatedAt(now);
        return invite;
    }

    private String buildInviteLink(String token, String kind) {
        String base = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
        return base + "/invite?token=" + token + "&kind=" + kind;
    }

    private String buildInviteEmailBody(String fullName, String link, String context) {
        StringBuilder builder = new StringBuilder();
        builder.append("Ola, ").append(fullName).append("!\n\n");
        builder.append("Voce recebeu um convite para acessar o ").append(context).append(".\n");
        builder.append("Acesse o link para cadastrar sua senha:\n");
        builder.append(link).append("\n\n");
        builder.append("Este link expira em ").append(inviteTtlHours).append(" horas.\n");
        builder.append("Se voce nao solicitou, ignore este email.");
        return builder.toString();
    }

    private UserInviteDTO toDTO(UserInvite invite) {
        return new UserInviteDTO(
                invite.getId(),
                invite.getFullName(),
                invite.getEmail(),
                invite.getRole(),
                invite.getStatus(),
                invite.getExpiresAt(),
                invite.getCreatedAt()
        );
    }

    private String normalizeEmail(String rawEmail) {
        if (rawEmail == null) return "";
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeToken(String rawToken) {
        if (rawToken == null) return "";
        return rawToken.trim();
    }

    private String generateUniqueToken() {
        for (int i = 0; i < 5; i++) {
            String token = generateToken();
            if (!inviteRepository.existsByTokenHash(hashToken(token))) {
                return token;
            }
        }
        throw new IllegalStateException("Falha ao gerar token de convite");
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Hashing nao disponivel", ex);
        }
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private com.guilherme.reviso_demand_manager.domain.Company resolveCompany(CreateClientUserInviteDTO dto, UUID agencyId) {
        if (dto.companyId() != null) {
            return companyRepository.findByIdAndAgencyId(dto.companyId(), agencyId)
                    .orElseThrow(() -> new IllegalArgumentException("Empresa nao encontrada"));
        }
        String companyCode = normalizeCompanyCode(dto.companyCode());
        if (companyCode != null) {
            return companyRepository.findByCompanyCodeIgnoreCaseAndAgencyId(companyCode, agencyId)
                    .orElseThrow(() -> new IllegalArgumentException("Codigo da empresa invalido"));
        }
        throw new IllegalArgumentException("companyId ou companyCode e obrigatorio");
    }

    private String normalizeCompanyCode(String rawCode) {
        if (rawCode == null) {
            return null;
        }
        String trimmed = rawCode.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }
}

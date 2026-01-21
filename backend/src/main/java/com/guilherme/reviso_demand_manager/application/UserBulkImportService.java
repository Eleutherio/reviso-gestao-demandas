package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.Company;
import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import com.guilherme.reviso_demand_manager.infra.AccessProfileRepository;
import com.guilherme.reviso_demand_manager.infra.CompanyRepository;
import com.guilherme.reviso_demand_manager.infra.EmailMessage;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import com.guilherme.reviso_demand_manager.web.BulkUserImportErrorDTO;
import com.guilherme.reviso_demand_manager.web.BulkUserImportResultDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class UserBulkImportService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final AccessProfileRepository accessProfileRepository;
    private final EmailOutboxService emailOutboxService;
    private final PasswordEncoder passwordEncoder;
    private final String frontendBaseUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserBulkImportService(
            UserRepository userRepository,
            CompanyRepository companyRepository,
            AccessProfileRepository accessProfileRepository,
            EmailOutboxService emailOutboxService,
            PasswordEncoder passwordEncoder,
            @Value("${frontend.base-url}") String frontendBaseUrl
    ) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.accessProfileRepository = accessProfileRepository;
        this.emailOutboxService = emailOutboxService;
        this.passwordEncoder = passwordEncoder;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Transactional
    public BulkUserImportResultDTO importAgencyUsers(String csv, UUID agencyId) {
        return importUsers(csv, agencyId, UserRole.AGENCY_USER);
    }

    @Transactional
    public BulkUserImportResultDTO importClientUsers(String csv, UUID agencyId) {
        return importUsers(csv, agencyId, UserRole.CLIENT_USER);
    }

    private BulkUserImportResultDTO importUsers(String csv, UUID agencyId, UserRole role) {
        if (agencyId == null) {
            throw new IllegalArgumentException("agencyId is required");
        }
        List<BulkUserImportErrorDTO> errors = new ArrayList<>();
        int created = 0;

        List<String> lines = splitLines(csv);
        if (lines.isEmpty()) {
            return new BulkUserImportResultDTO(0, List.of(
                new BulkUserImportErrorDTO(0, "CSV vazio")
            ));
        }

        Map<String, Integer> headerIndex = parseHeader(lines.get(0));
        if (!headerIndex.containsKey("fullname") || !headerIndex.containsKey("email")) {
            return new BulkUserImportResultDTO(0, List.of(
                new BulkUserImportErrorDTO(0, "Cabecalho deve conter fullName e email")
            ));
        }

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.isBlank()) {
                continue;
            }
            int lineNumber = i + 1;
            try {
                List<String> fields = parseCsvLine(line);
                String fullName = getField(fields, headerIndex, "fullname", "full_name");
                String email = getField(fields, headerIndex, "email");
                if (fullName == null || fullName.isBlank()) {
                    throw new IllegalArgumentException("fullName obrigatorio");
                }
                if (email == null || email.isBlank()) {
                    throw new IllegalArgumentException("email obrigatorio");
                }
                String normalizedEmail = normalizeEmail(email);
                if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
                    throw new IllegalArgumentException("email ja esta em uso");
                }

                Company company = null;
                UUID accessProfileId = null;

                if (role == UserRole.CLIENT_USER) {
                    company = resolveCompany(fields, headerIndex, agencyId);
                } else {
                    accessProfileId = resolveAccessProfile(fields, headerIndex, agencyId);
                }

                String tempPassword = generateTempPassword();
                User user = new User();
                user.setId(UUID.randomUUID());
                user.setFullName(fullName);
                user.setEmail(normalizedEmail);
                user.setPasswordHash(passwordEncoder.encode(tempPassword));
                user.setRole(role);
                user.setAgencyId(agencyId);
                user.setCompanyId(company != null ? company.getId() : null);
                user.setAccessProfileId(accessProfileId);
                user.setActive(true);
                user.setCreatedAt(OffsetDateTime.now());
                userRepository.save(user);

                sendTempPasswordEmail(user, tempPassword, role);
                created++;
            } catch (Exception ex) {
                errors.add(new BulkUserImportErrorDTO(lineNumber, ex.getMessage()));
            }
        }

        return new BulkUserImportResultDTO(created, errors);
    }

    private Company resolveCompany(List<String> fields, Map<String, Integer> headerIndex, UUID agencyId) {
        String companyIdRaw = getField(fields, headerIndex, "companyid", "company_id");
        if (companyIdRaw != null && !companyIdRaw.isBlank()) {
            UUID companyId = parseUuid(companyIdRaw, "companyId invalido");
            return companyRepository.findByIdAndAgencyId(companyId, agencyId)
                    .orElseThrow(() -> new IllegalArgumentException("companyId invalido"));
        }
        String companyCode = getField(fields, headerIndex, "companycode", "company_code");
        if (companyCode != null && !companyCode.isBlank()) {
            return companyRepository.findByCompanyCodeIgnoreCaseAndAgencyId(companyCode.trim(), agencyId)
                    .orElseThrow(() -> new IllegalArgumentException("companyCode invalido"));
        }
        throw new IllegalArgumentException("companyId ou companyCode obrigatorio");
    }

    private UUID resolveAccessProfile(List<String> fields, Map<String, Integer> headerIndex, UUID agencyId) {
        String accessProfileIdRaw = getField(fields, headerIndex, "accessprofileid", "access_profile_id");
        if (accessProfileIdRaw != null && !accessProfileIdRaw.isBlank()) {
            UUID accessProfileId = parseUuid(accessProfileIdRaw, "accessProfileId invalido");
            accessProfileRepository.findByIdAndAgencyId(accessProfileId, agencyId)
                    .orElseThrow(() -> new IllegalArgumentException("accessProfileId invalido"));
            return accessProfileId;
        }
        String accessProfileName = getField(fields, headerIndex, "accessprofilename", "access_profile_name");
        if (accessProfileName != null && !accessProfileName.isBlank()) {
            return accessProfileRepository.findByAgencyIdAndNameIgnoreCase(agencyId, accessProfileName.trim())
                    .map(profile -> profile.getId())
                    .orElseThrow(() -> new IllegalArgumentException("accessProfileName invalido"));
        }
        throw new IllegalArgumentException("accessProfileId ou accessProfileName obrigatorio");
    }

    private UUID parseUuid(String raw, String errorMessage) {
        try {
            return UUID.fromString(raw.trim());
        } catch (Exception ex) {
            throw new IllegalArgumentException(errorMessage);
        }
    }

    private void sendTempPasswordEmail(User user, String tempPassword, UserRole role) {
        String link = buildLoginLink(role);
        StringBuilder body = new StringBuilder();
        body.append("Ola, ").append(user.getFullName()).append("!\n\n");
        body.append("Seu usuario foi criado com senha temporaria.\n");
        body.append("Senha: ").append(tempPassword).append("\n\n");
        body.append("Acesse: ").append(link).append("\n");
        body.append("Recomendamos trocar a senha apos o primeiro login.");

        emailOutboxService.enqueueAndSend(new EmailMessage(
                user.getEmail(),
                "Sua conta no Reviso",
                body.toString()
        ));
    }

    private String buildLoginLink(UserRole role) {
        String base = frontendBaseUrl.endsWith("/") ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1) : frontendBaseUrl;
        if (role == UserRole.CLIENT_USER) {
            return base + "/login-client";
        }
        return base + "/login";
    }

    private String normalizeEmail(String rawEmail) {
        if (rawEmail == null) return "";
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private String generateTempPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            int idx = secureRandom.nextInt(alphabet.length());
            builder.append(alphabet.charAt(idx));
        }
        return builder.toString();
    }

    private List<String> splitLines(String csv) {
        List<String> lines = new ArrayList<>();
        if (csv == null) {
            return lines;
        }
        for (String line : csv.split("\\r?\\n")) {
            lines.add(line);
        }
        return lines;
    }

    private Map<String, Integer> parseHeader(String headerLine) {
        Map<String, Integer> headerIndex = new HashMap<>();
        List<String> headers = parseCsvLine(headerLine);
        for (int i = 0; i < headers.size(); i++) {
            String key = headers.get(i).trim().toLowerCase(Locale.ROOT);
            headerIndex.put(key, i);
        }
        return headerIndex;
    }

    private String getField(List<String> fields, Map<String, Integer> headerIndex, String... keys) {
        for (String key : keys) {
            Integer idx = headerIndex.get(key);
            if (idx != null && idx < fields.size()) {
                return fields.get(idx).trim();
            }
        }
        return null;
    }

    private List<String> parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == ',' && !inQuotes) {
                fields.add(current.toString());
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        fields.add(current.toString());
        return fields;
    }
}

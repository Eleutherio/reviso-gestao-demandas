package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.Agency;
import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import com.guilherme.reviso_demand_manager.infra.AgencyRepository;
import com.guilherme.reviso_demand_manager.infra.EmailMessage;
import com.guilherme.reviso_demand_manager.infra.EmailSendStatus;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
public class AgencyCodeRecoveryService {

    private final AgencyRepository agencyRepository;
    private final UserRepository userRepository;
    private final EmailOutboxService emailOutboxService;

    public AgencyCodeRecoveryService(
        AgencyRepository agencyRepository,
        UserRepository userRepository,
        EmailOutboxService emailOutboxService
    ) {
        this.agencyRepository = agencyRepository;
        this.userRepository = userRepository;
        this.emailOutboxService = emailOutboxService;
    }

    public EmailSendStatus sendRecoveryEmail(String rawEmail) {
        String email = normalizeEmail(rawEmail);
        String agencyCode = resolveActiveAgencyCode(email);
        if (agencyCode == null) {
            return EmailSendStatus.SENT;
        }
        EmailMessage message = new EmailMessage(
            email,
            "Seu codigo da agencia",
            buildAgencyCodeRecoveryBody(agencyCode)
        );
        return emailOutboxService.enqueueAndSend(message);
    }

    String resolveActiveAgencyCode(String email) {
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            return null;
        }

        if (!Boolean.TRUE.equals(user.getActive())
            || user.getRole() == UserRole.CLIENT_USER
            || user.getAgencyId() == null) {
            return null;
        }

        Optional<Agency> agency = agencyRepository.findById(user.getAgencyId());
        if (agency.isEmpty()) {
            return null;
        }

        Agency found = agency.get();
        if (!Boolean.TRUE.equals(found.getActive())) {
            return null;
        }

        String code = found.getAgencyCode();
        if (code == null || code.isBlank()) {
            return null;
        }

        return code;
    }

    private String normalizeEmail(String rawEmail) {
        if (rawEmail == null) return "";
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private String buildAgencyCodeRecoveryBody(String agencyCode) {
        StringBuilder builder = new StringBuilder();
        builder.append("Recebemos seu pedido para recuperar o codigo da agencia.\n\n");
        builder.append("Codigo da agencia associado ao seu email:\n");
        builder.append("- ").append(agencyCode).append('\n');
        builder.append("\nSe voce nao solicitou, ignore este email.");
        return builder.toString();
    }
}

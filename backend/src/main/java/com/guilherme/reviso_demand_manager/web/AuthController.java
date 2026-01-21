package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.application.AgencyPasswordRecoveryService;
import com.guilherme.reviso_demand_manager.application.CompanyCodeRecoveryService;
import com.guilherme.reviso_demand_manager.domain.Company;
import com.guilherme.reviso_demand_manager.domain.CompanyType;
import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import com.guilherme.reviso_demand_manager.infra.EmailSendStatus;
import com.guilherme.reviso_demand_manager.infra.JwtService;
import com.guilherme.reviso_demand_manager.infra.RateLimitService;
import com.guilherme.reviso_demand_manager.infra.AgencyRepository;
import com.guilherme.reviso_demand_manager.infra.CompanyRepository;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RateLimitService rateLimitService;
    private final CompanyCodeRecoveryService companyCodeRecoveryService;
    private final AgencyPasswordRecoveryService agencyPasswordRecoveryService;
    private final AgencyRepository agencyRepository;

    public AuthController(UserRepository userRepository, 
                          CompanyRepository companyRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          RateLimitService rateLimitService,
                          CompanyCodeRecoveryService companyCodeRecoveryService,
                          AgencyPasswordRecoveryService agencyPasswordRecoveryService,
                          AgencyRepository agencyRepository) {
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.rateLimitService = rateLimitService;
        this.companyCodeRecoveryService = companyCodeRecoveryService;
        this.agencyPasswordRecoveryService = agencyPasswordRecoveryService;
        this.agencyRepository = agencyRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO dto,
                                                    HttpServletRequest request) {
        String clientIp = getClientIp(request);
        String normalizedEmail = normalizeEmail(dto.email());
        
        // Limitacao de taxa: IP + Email
        if (!rateLimitService.isAllowed("login:ip:" + clientIp)) {
            throw new TooManyRequestsException("Muitas tentativas de login. Aguarde 1 minuto.");
        }
        if (!rateLimitService.isAllowed("login:email:" + normalizedEmail)) {
            throw new TooManyRequestsException("Muitas tentativas para este email. Aguarde 1 minuto.");
        }

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Credenciais invalidas"));

        if (user.getRole() == UserRole.CLIENT_USER) {
            throw new UnauthorizedException("Credenciais invalidas");
        }

        if (!user.getActive()) {
            throw new UnauthorizedException("Usuario inativo");
        }

        if (!passwordEncoder.matches(dto.password(), user.getPasswordHash())) {
            // Loga tentativa falha
            log.warn("Failed login attempt - email: {}, ip: {}", normalizedEmail, clientIp);
            throw new UnauthorizedException("Credenciais invalidas");
        }

        if (!isAgencyActive(user.getAgencyId())) {
            log.warn("Login blocked: inactive agencyId={} email={}", user.getAgencyId(), normalizedEmail);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        // Login bem-sucedido: reseta limites de taxa
        rateLimitService.reset("login:ip:" + clientIp);
        rateLimitService.reset("login:email:" + normalizedEmail);
        log.info("Successful login - email: {}, ip: {}", normalizedEmail, clientIp);

        String token = jwtService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.getCompanyId(),
                user.getAgencyId()
        );

        LoginResponseDTO response = new LoginResponseDTO(
                token,
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getCompanyId(),
                user.getAgencyId()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login-client")
    public ResponseEntity<LoginResponseDTO> loginClient(@Valid @RequestBody LoginClientRequestDTO dto,
                                                        HttpServletRequest request) {
        String clientIp = getClientIp(request);
        String normalizedEmail = normalizeEmail(dto.email());
        
        // Limitacao de taxa: IP + Email
        if (!rateLimitService.isAllowed("login-client:ip:" + clientIp)) {
            throw new TooManyRequestsException("Muitas tentativas de login. Aguarde 1 minuto.");
        }
        if (!rateLimitService.isAllowed("login-client:email:" + normalizedEmail)) {
            throw new TooManyRequestsException("Muitas tentativas para este email. Aguarde 1 minuto.");
        }

        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
            .filter(found -> found.getRole() == UserRole.CLIENT_USER)
            .orElseThrow(() -> new UnauthorizedException("Credenciais invalidas"));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new UnauthorizedException("Usuario inativo");
        }

        if (user.getCompanyId() == null || user.getAgencyId() == null) {
            throw new UnauthorizedException("Credenciais invalidas");
        }

        String normalizedCode = normalizeCompanyCode(dto.companyCode());
        Company company = companyRepository.findByCompanyCodeIgnoreCaseAndAgencyId(normalizedCode, user.getAgencyId())
            .filter(found -> found.getType() == CompanyType.CLIENT)
            .orElseThrow(() -> new UnauthorizedException("Codigo da empresa invalido"));

        if (!Boolean.TRUE.equals(company.getActive())) {
            throw new UnauthorizedException("Codigo da empresa invalido");
        }

        if (!user.getCompanyId().equals(company.getId())) {
            throw new UnauthorizedException("Credenciais invalidas");
        }

        if (!passwordEncoder.matches(dto.password(), user.getPasswordHash())) {
            // Loga tentativa falha
            log.warn("Failed client login attempt - email: {}, company: {}, ip: {}", 
                normalizedEmail, normalizedCode, clientIp);
            throw new UnauthorizedException("Credenciais invalidas");
        }

        if (!isAgencyActive(user.getAgencyId())) {
            log.warn("Login blocked: inactive agencyId={} email={}", user.getAgencyId(), normalizedEmail);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Login bem-sucedido: reseta limites de taxa
        rateLimitService.reset("login-client:ip:" + clientIp);
        rateLimitService.reset("login-client:email:" + normalizedEmail);
        log.info("Successful client login - email: {}, company: {}, ip: {}", 
            normalizedEmail, normalizedCode, clientIp);

        String token = jwtService.generateToken(
            user.getId(),
            user.getEmail(),
            user.getRole(),
            user.getCompanyId(),
            user.getAgencyId()
        );

        LoginResponseDTO response = new LoginResponseDTO(
            token,
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            user.getRole(),
            user.getCompanyId(),
            user.getAgencyId()
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/recover-company-code")
    public ResponseEntity<Map<String, Object>> recoverCompanyCode(
        @Valid @RequestBody RecoverCompanyCodeRequestDTO dto,
        HttpServletRequest request
    ) {
        String clientIp = getClientIp(request);
        String normalizedEmail = normalizeEmail(dto.email());
        if (!rateLimitService.isAllowed("recover-company-code:ip:" + clientIp)
            || !rateLimitService.isAllowed("recover-company-code:email:" + normalizedEmail)) {
            throw new TooManyRequestsException("Muitas tentativas. Aguarde 1 minuto.");
        }
        EmailSendStatus status = companyCodeRecoveryService.sendRecoveryEmail(dto.email());

        Map<String, Object> response = new HashMap<>();
        if (status == EmailSendStatus.QUOTA) {
            response.put("status", HttpStatus.ACCEPTED.value());
            response.put("message", "Limite de envio atingido. Seu pedido foi registrado e sera enviado em breve.");
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        }
        if (status == EmailSendStatus.RETRY) {
            response.put("status", HttpStatus.ACCEPTED.value());
            response.put("message", "Estamos com instabilidade no envio. Seu pedido foi registrado.");
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        }
        if (status == EmailSendStatus.FAILED) {
            response.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.put("error", "Falha ao enviar email");
            response.put("message", "Nao foi possivel enviar o email de recuperacao.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }

        response.put("status", HttpStatus.OK.value());
        response.put("message", "Se o email estiver ativo, enviaremos os codigos.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/recover-agency-password")
    public ResponseEntity<Map<String, Object>> recoverAgencyPassword(
        @Valid @RequestBody RecoverAgencyPasswordRequestDTO dto,
        HttpServletRequest request
    ) {
        String clientIp = getClientIp(request);
        String normalizedEmail = normalizeEmail(dto.email());
        if (!rateLimitService.isAllowed("recover-agency-password:ip:" + clientIp)
            || !rateLimitService.isAllowed("recover-agency-password:email:" + normalizedEmail)) {
            throw new TooManyRequestsException("Muitas tentativas. Aguarde 1 minuto.");
        }

        EmailSendStatus status = agencyPasswordRecoveryService.requestToken(dto.email());

        Map<String, Object> response = new HashMap<>();
        if (status == EmailSendStatus.QUOTA) {
            response.put("status", HttpStatus.ACCEPTED.value());
            response.put("message", "Limite de envio atingido. Seu pedido foi registrado e sera enviado em breve.");
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        }
        if (status == EmailSendStatus.RETRY) {
            response.put("status", HttpStatus.ACCEPTED.value());
            response.put("message", "Estamos com instabilidade no envio. Seu pedido foi registrado.");
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
        }
        if (status == EmailSendStatus.FAILED) {
            response.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.put("error", "Falha ao enviar email");
            response.put("message", "Nao foi possivel enviar o token de recuperacao.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }

        response.put("status", HttpStatus.OK.value());
        response.put("message", "Se o email estiver ativo, enviaremos um token.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/recover-agency-password/confirm")
    public ResponseEntity<Map<String, Object>> confirmRecoverAgencyPassword(
        @Valid @RequestBody RecoverAgencyPasswordConfirmRequestDTO dto,
        HttpServletRequest request
    ) {
        String clientIp = getClientIp(request);
        String normalizedEmail = normalizeEmail(dto.email());
        if (!rateLimitService.isAllowed("recover-agency-password-confirm:ip:" + clientIp)
            || !rateLimitService.isAllowed("recover-agency-password-confirm:email:" + normalizedEmail)) {
            throw new TooManyRequestsException("Muitas tentativas. Aguarde 1 minuto.");
        }

        boolean success = agencyPasswordRecoveryService.resetPassword(
            dto.email(),
            dto.token(),
            dto.newPassword()
        );

        Map<String, Object> response = new HashMap<>();
        if (!success) {
            response.put("status", HttpStatus.BAD_REQUEST.value());
            response.put("error", "Token invalido ou expirado");
            response.put("message", "Token invalido ou expirado.");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }

        response.put("status", HttpStatus.OK.value());
        response.put("message", "Senha atualizada com sucesso.");
        return ResponseEntity.ok(response);
    }
    
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        } else {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private String normalizeCompanyCode(String rawCode) {
        if (rawCode == null) return "";
        return rawCode.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeEmail(String rawEmail) {
        if (rawEmail == null) return "";
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isAgencyActive(UUID agencyId) {
        return agencyId != null && agencyRepository.existsByIdAndActiveTrue(agencyId);
    }
}

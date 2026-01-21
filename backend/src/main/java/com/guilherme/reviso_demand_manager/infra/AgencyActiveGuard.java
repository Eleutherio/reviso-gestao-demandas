package com.guilherme.reviso_demand_manager.infra;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class AgencyActiveGuard extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(AgencyActiveGuard.class);

    private final AgencyRepository agencyRepository;

    public AgencyActiveGuard(AgencyRepository agencyRepository) {
        this.agencyRepository = agencyRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        if (isHealthEndpoint(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof JwtAuthFilter.AuthenticatedUser user)) {
            filterChain.doFilter(request, response);
            return;
        }

        UUID agencyId = user.agencyId();
        if (agencyId == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!agencyRepository.existsByIdAndActiveTrue(agencyId)) {
            log.warn("Agency inactive: blocked request path={} agencyId={} userId={}", path, agencyId, user.userId());
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Agency inactive\",\"code\":\"AGENCY_INACTIVE\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isHealthEndpoint(String path) {
        return "/actuator/health".equals(path) || (path != null && path.startsWith("/actuator/health/"));
    }
}

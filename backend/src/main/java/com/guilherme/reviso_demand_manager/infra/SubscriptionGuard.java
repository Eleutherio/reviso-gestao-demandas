package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.AccessPolicy;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(2) // Após JwtAuthFilter
public class SubscriptionGuard extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionGuard.class);

    private final SubscriptionRepository subscriptionRepository;

    public SubscriptionGuard(
            SubscriptionRepository subscriptionRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        var agencyIdStr = (String) request.getAttribute("agencyId");
        var role = (UserRole) request.getAttribute("role");

        // Skip se não autenticado ou não é agência
        if (agencyIdStr == null || role == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Skip endpoints públicos
        var path = request.getRequestURI();
        if (isPublicEndpoint(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var agencyId = UUID.fromString(agencyIdStr);

            var subscription = subscriptionRepository.findByAgencyId(agencyId).orElse(null);
            if (subscription == null) {
                log.warn("Subscription guard: no subscription agencyId={}", agencyId);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"No subscription\",\"code\":\"NO_SUBSCRIPTION\"}");
                return;
            }

            var status = subscription.getStatus();

            if (AccessPolicy.isBlocked(status)) {
                log.warn("Subscription guard: blocked agencyId={} status={}", agencyId, status);
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"" + AccessPolicy.getBlockReason(status) + "\",\"code\":\"SUBSCRIPTION_BLOCKED\",\"status\":\"" + status + "\"}");
                return;
            }

            if (!AccessPolicy.canWrite(status) && isWriteEndpoint(request)) {
                log.warn("Subscription guard: write blocked agencyId={} status={}", agencyId, status);
                response.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"" + AccessPolicy.getBlockReason(status) + "\",\"code\":\"WRITE_BLOCKED\",\"status\":\"" + status + "\"}");
                return;
            }

            if (!AccessPolicy.canAccessPremium(status) && isPremiumEndpoint(path)) {
                log.warn("Subscription guard: premium blocked agencyId={} status={}", agencyId, status);
                response.setStatus(HttpServletResponse.SC_PAYMENT_REQUIRED);
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"Feature premium. Fa\u00e7a upgrade.\",\"code\":\"PREMIUM_BLOCKED\",\"status\":\"" + status + "\"}");
                return;
            }

            filterChain.doFilter(request, response);
        } catch (Exception e) {
            log.error("Subscription guard error", e);
            filterChain.doFilter(request, response);
        }
    }

    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/auth/") ||
               path.startsWith("/onboarding/") ||
               path.startsWith("/public/") ||
               path.startsWith("/actuator/");
    }

    private boolean isWriteEndpoint(HttpServletRequest request) {
        var method = request.getMethod();
        return method.equals("POST") || method.equals("PUT") || 
               method.equals("PATCH") || method.equals("DELETE");
    }

    private boolean isPremiumEndpoint(String path) {
        // Endpoints que exigem subscription ativa (não trial)
        return path.startsWith("/admin/users") && path.contains("bulk") ||
               path.startsWith("/admin/export") ||
               path.startsWith("/analytics/");
    }
}

package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.Subscription;
import com.guilherme.reviso_demand_manager.domain.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByAgencyId(UUID agencyId);
    Optional<Subscription> findByStripeSubscriptionId(String stripeSubscriptionId);
    Optional<Subscription> findByStripeCheckoutSessionId(String stripeCheckoutSessionId);
    List<Subscription> findByStatusAndCurrentPeriodEndBefore(SubscriptionStatus status, OffsetDateTime date);
}

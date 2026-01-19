package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.SubscriptionStatus;
import com.guilherme.reviso_demand_manager.infra.AgencyRepository;
import com.guilherme.reviso_demand_manager.infra.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class SubscriptionExpirationJob {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionExpirationJob.class);

    private final SubscriptionRepository subscriptionRepository;
    private final AgencyRepository agencyRepository;

    public SubscriptionExpirationJob(
            SubscriptionRepository subscriptionRepository,
            AgencyRepository agencyRepository
    ) {
        this.subscriptionRepository = subscriptionRepository;
        this.agencyRepository = agencyRepository;
    }

    @Scheduled(cron = "0 0 2 * * *") // Diário às 2 AM
    @Transactional
    public void expireTrials() {
        log.info("Job: checking expired trials");

        var now = OffsetDateTime.now();
        var expiredTrials = subscriptionRepository.findByStatusAndCurrentPeriodEndBefore(
                SubscriptionStatus.TRIALING, now);

        for (var subscription : expiredTrials) {
            subscription.transitionTo(SubscriptionStatus.TRIAL_EXPIRED);
            subscriptionRepository.save(subscription);

            // NÃO desativa agency - mantém login funcionando
            log.info("Job: trial expired agencyId={} subscriptionId={}", 
                    subscription.getAgencyId(), subscription.getId());
        }

        log.info("Job: expired {} trials", expiredTrials.size());
    }
}

package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.BillingProvider;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "billing")
public class BillingConfig {

    private BillingProvider provider = BillingProvider.MOCK;
    private int trialDays = 14;

    public BillingProvider getProvider() {
        return provider;
    }

    public void setProvider(BillingProvider provider) {
        this.provider = provider;
    }

    public int getTrialDays() {
        return trialDays;
    }

    public void setTrialDays(int trialDays) {
        this.trialDays = trialDays;
    }

    public boolean isMock() {
        return provider == BillingProvider.MOCK;
    }

    public boolean isStripe() {
        return provider == BillingProvider.STRIPE;
    }
}

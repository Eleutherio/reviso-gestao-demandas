package com.guilherme.reviso_demand_manager.application;

import java.util.Locale;
import java.util.UUID;

public final class AgencyCodeGenerator {

    private AgencyCodeGenerator() {}

    public static String generate(UUID agencyId) {
        String suffix = agencyId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
        return "AGY-" + suffix;
    }
}

package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.Agency;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.default-agency", havingValue = "true", matchIfMissing = true)
public class DefaultAgencySeeder implements ApplicationRunner {

    private final AgencyRepository agencyRepository;
    private final JdbcTemplate jdbcTemplate;

    private final UUID defaultAgencyId;
    private final String defaultAgencyName;

    public DefaultAgencySeeder(
            AgencyRepository agencyRepository,
            JdbcTemplate jdbcTemplate,
            @Value("${app.seed.default-agency-id:11111111-1111-1111-1111-111111111110}") UUID defaultAgencyId,
            @Value("${app.seed.default-agency-name:Reviso Agency}") String defaultAgencyName) {
        this.agencyRepository = agencyRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.defaultAgencyId = defaultAgencyId;
        this.defaultAgencyName = defaultAgencyName;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        UUID agencyId = ensureDefaultAgency();
        backfillAgencyId("companies", agencyId);
        backfillAgencyId("users", agencyId);
        backfillAgencyId("requests", agencyId);
        backfillAgencyId("briefings", agencyId);
    }

    private UUID ensureDefaultAgency() {
        return agencyRepository.findById(defaultAgencyId)
            .map(Agency::getId)
            .orElseGet(() -> {
                Agency agency = new Agency();
                agency.setId(defaultAgencyId);
                agency.setName(defaultAgencyName);
                agency.setActive(true);
                agency.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
                return agencyRepository.save(agency).getId();
            });
    }

    private void backfillAgencyId(String table, UUID agencyId) {
        String sql = "UPDATE " + table + " SET agency_id = ? WHERE agency_id IS NULL";
        jdbcTemplate.update(sql, agencyId);
    }
}

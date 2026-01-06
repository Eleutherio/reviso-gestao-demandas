package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.Briefing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BriefingRepository extends JpaRepository<Briefing, UUID> {
}

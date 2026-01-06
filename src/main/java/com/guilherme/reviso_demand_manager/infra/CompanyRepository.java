package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
}

package com.guilherme.reviso_demand_manager.web;

import com.guilherme.reviso_demand_manager.domain.CompanyType;

import java.util.List;

public record UpdateCompanyDTO(
        String name,
        CompanyType type,
        Boolean active,
        String segment,
        String contactEmail,
        String site,
        List<String> usefulLinks
) {
}

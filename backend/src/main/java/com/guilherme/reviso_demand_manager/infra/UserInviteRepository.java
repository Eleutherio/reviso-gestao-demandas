package com.guilherme.reviso_demand_manager.infra;

import com.guilherme.reviso_demand_manager.domain.InviteStatus;
import com.guilherme.reviso_demand_manager.domain.UserInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserInviteRepository extends JpaRepository<UserInvite, UUID> {
    Optional<UserInvite> findByTokenHash(String tokenHash);
    Optional<UserInvite> findByIdAndAgencyId(UUID id, UUID agencyId);
    boolean existsByTokenHash(String tokenHash);
    List<UserInvite> findByStatusAndExpiresAtBefore(InviteStatus status, OffsetDateTime expiresAt);
}

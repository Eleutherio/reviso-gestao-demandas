package com.guilherme.reviso_demand_manager.application;

import com.guilherme.reviso_demand_manager.domain.User;
import com.guilherme.reviso_demand_manager.domain.UserRole;
import com.guilherme.reviso_demand_manager.infra.UserRepository;
import com.guilherme.reviso_demand_manager.web.CreateUserDTO;
import com.guilherme.reviso_demand_manager.web.ResourceNotFoundException;
import com.guilherme.reviso_demand_manager.web.UpdateUserDTO;
import com.guilherme.reviso_demand_manager.web.UserDTO;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserDTO createUser(CreateUserDTO dto) {
        // Validate email uniqueness
        if (userRepository.findByEmail(dto.email()).isPresent()) {
            throw new IllegalArgumentException("Email já está em uso");
        }

        // Validate companyId for CLIENT_USER
        if (dto.role() == UserRole.CLIENT_USER && dto.companyId() == null) {
            throw new IllegalArgumentException("CLIENT_USER deve ter companyId");
        }

        User user = new User();
        user.setId(UUID.randomUUID());
        user.setFullName(dto.fullName());
        user.setEmail(dto.email());
        user.setPasswordHash(passwordEncoder.encode(dto.password()));
        user.setRole(dto.role());
        user.setCompanyId(dto.companyId());
        user.setActive(true);
        user.setCreatedAt(OffsetDateTime.now());

        User saved = userRepository.save(user);
        return toDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<UserDTO> listAllUsers() {
        return userRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public UserDTO updateUser(UUID id, UpdateUserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));

        if (!user.getEmail().equals(dto.email())) {
            userRepository.findByEmail(dto.email())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Email ja esta em uso");
                    });
        }

        if (dto.role() == UserRole.CLIENT_USER && dto.companyId() == null) {
            throw new IllegalArgumentException("CLIENT_USER deve ter companyId");
        }

        user.setFullName(dto.fullName());
        user.setEmail(dto.email());
        user.setRole(dto.role());
        user.setCompanyId(dto.companyId());
        if (dto.active() != null) {
            user.setActive(dto.active());
        }

        User saved = userRepository.save(user);
        return toDTO(saved);
    }

    @Transactional
    public void deleteUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario nao encontrado"));
        userRepository.delete(user);
    }

    private UserDTO toDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.getCompanyId(),
                user.getActive(),
                user.getCreatedAt()
        );
    }
}

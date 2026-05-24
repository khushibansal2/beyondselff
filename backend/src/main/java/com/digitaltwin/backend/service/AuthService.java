package com.digitaltwin.backend.service;

import com.digitaltwin.backend.entity.User;
import com.digitaltwin.backend.repository.UserRepository;
import com.digitaltwin.backend.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepo, JwtUtil jwtUtil, BCryptPasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> signup(String email, String password, String name) {
        if (email == null || password == null || email.isBlank() || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }
        if (userRepo.existsByEmail(email.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        User user = User.builder()
                .email(email.toLowerCase())
                .passwordHash(passwordEncoder.encode(password))
                .name(name != null ? name : email.split("@")[0])
                .createdAt(LocalDateTime.now())
                .build();
        user = userRepo.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return Map.of(
                "token", token,
                "userId", user.getId(),
                "email", user.getEmail(),
                "name", user.getName()
        );
    }

    public Map<String, Object> login(String email, String password) {
        if (email == null || password == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and password are required");
        }
        User user = userRepo.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        return Map.of(
                "token", token,
                "userId", user.getId(),
                "email", user.getEmail(),
                "name", user.getName() != null ? user.getName() : ""
        );
    }

    public Map<String, Object> getProfile(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return Map.of(
                "userId", user.getId(),
                "email", user.getEmail(),
                "name", user.getName() != null ? user.getName() : "",
                "createdAt", user.getCreatedAt().toString()
        );
    }
}

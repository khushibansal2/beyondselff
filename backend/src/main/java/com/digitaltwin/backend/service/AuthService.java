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

    public Map<String, Object> signup(String email, String password, String name, Integer age, String gender) {
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
                .age(age)
                .gender(gender)
                .createdAt(LocalDateTime.now())
                .build();
        user = userRepo.save(user);
        String token = jwtUtil.generateToken(user.getId(), user.getEmail());
        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("token", token);
        resp.put("userId", user.getId());
        resp.put("email", user.getEmail());
        resp.put("name", user.getName());
        resp.put("age", user.getAge());
        resp.put("gender", user.getGender());
        return resp;
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
        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("token", token);
        resp.put("userId", user.getId());
        resp.put("email", user.getEmail());
        resp.put("name", user.getName() != null ? user.getName() : "");
        resp.put("age", user.getAge());
        resp.put("gender", user.getGender());
        return resp;
    }

    public Map<String, Object> getProfile(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        java.util.Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("userId", user.getId());
        resp.put("email", user.getEmail());
        resp.put("name", user.getName() != null ? user.getName() : "");
        resp.put("age", user.getAge());
        resp.put("gender", user.getGender());
        resp.put("createdAt", user.getCreatedAt().toString());
        return resp;
    }
}

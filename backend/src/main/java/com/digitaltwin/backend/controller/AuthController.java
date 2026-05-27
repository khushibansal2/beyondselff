package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.service.AuthService;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    // Simple brute-force protection map (IP/Email -> count, reset timestamp)
    private final Map<String, Integer> failedAttempts = new ConcurrentHashMap<>();

    private final AuthService authService;
    private final AuthUtil authUtil;

    public AuthController(AuthService authService, AuthUtil authUtil) {
        this.authService = authService;
        this.authUtil = authUtil;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.signup(
                body.get("email"),
                body.get("password"),
                body.get("name")
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, jakarta.servlet.http.HttpServletRequest request) {
        String email = body.get("email");
        String ip = request.getRemoteAddr();
        String attemptKey = ip + ":" + email;

        // Basic Rate Limiting Check
        if (failedAttempts.getOrDefault(attemptKey, 0) >= 5) {
            log.warn("[SECURITY AUDIT] Blocked brute force attempt from IP: {} for email: {}", ip, email);
            return ResponseEntity.status(429).body(Map.of("error", "Too many failed attempts. Please try again later."));
        }

        try {
            Map<String, Object> response = authService.login(email, body.get("password"));
            log.info("[SECURITY AUDIT] Successful login for user: {} from IP: {}", email, ip);
            failedAttempts.remove(attemptKey); // reset on success
            return ResponseEntity.ok(response);
        } catch (org.springframework.web.server.ResponseStatusException e) {
            failedAttempts.put(attemptKey, failedAttempts.getOrDefault(attemptKey, 0) + 1);
            log.warn("[SECURITY AUDIT] Failed login attempt for user: {} from IP: {}. Attempt {}/5", email, ip, failedAttempts.get(attemptKey));
            throw e;
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        String userId = authUtil.getUserId();
        return ResponseEntity.ok(authService.getProfile(userId));
    }
}

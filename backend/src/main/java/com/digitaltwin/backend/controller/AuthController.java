package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.service.AuthService;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

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
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.login(
                body.get("email"),
                body.get("password")
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        String userId = authUtil.getUserIdFromToken(authHeader);
        return ResponseEntity.ok(authService.getProfile(userId));
    }
}

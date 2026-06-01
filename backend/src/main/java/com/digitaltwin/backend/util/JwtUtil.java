package com.digitaltwin.backend.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);

    @Value("${jwt.secret:}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private long expiration;

    private SecretKey jwtKey;

    private synchronized SecretKey getKey() {
        if (jwtKey != null) {
            return jwtKey;
        }

        if (secret == null || secret.isBlank() || "beyondself-hackathon-jwt-secret-key-2025-digitaltwin-secure".equals(secret.trim())) {
            byte[] randomBytes = new byte[32];
            new java.security.SecureRandom().nextBytes(randomBytes);
            jwtKey = Keys.hmacShaKeyFor(randomBytes);
            log.warn("CRITICAL: Using dynamically generated secure random JWT secret. Active sessions will not persist across server restarts.");
        } else {
            byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
            if (keyBytes.length < 32) {
                byte[] padded = new byte[32];
                System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
                jwtKey = Keys.hmacShaKeyFor(padded);
            } else {
                jwtKey = Keys.hmacShaKeyFor(keyBytes);
            }
        }
        return jwtKey;
    }

    public String generateToken(String userId, String email) {
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getKey())
                .compact();
    }

    public String getUserIdFromToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.getSubject();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
    }
}

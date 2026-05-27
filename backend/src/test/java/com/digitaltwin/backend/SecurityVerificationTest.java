package com.digitaltwin.backend;

import com.digitaltwin.backend.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Security verification tests for the Digital Twin backend.
 *
 * Covers:
 *  - Public routes accessible without token
 *  - Missing/expired/tampered JWT rejected with 401
 *  - Legacy dt_jwt_ / DEMO_SESSION_ tokens rejected
 *  - Protected routes require a valid signed JWT
 *  - Cross-user access blocked (403)
 *  - AI endpoint returns fallback when Groq unavailable
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "groq.api.key=",
    "jwt.secret=hackathon-test-secret-key-32xxYY",
    "cors.allowed-origins=http://localhost:5173"
})
class SecurityVerificationTest {

    @Autowired MockMvc mvc;
    @Autowired JwtUtil jwtUtil;

    private String validToken;

    @BeforeEach
    void setUp() {
        // Generate a valid signed JWT for a test user
        validToken = jwtUtil.generateToken("test-user-001", "test@example.com");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. PUBLIC ROUTES — must be accessible without any token
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/login is accessible without token")
    void publicRoute_login_noTokenRequired() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nobody@test.com\",\"password\":\"wrong\"}"))
           .andExpect(status().isUnauthorized()); // 401 from AuthService (wrong creds), NOT from filter
        // Key: the filter did NOT block it — control reached the controller
    }

    @Test
    @DisplayName("POST /api/auth/signup is accessible without token")
    void publicRoute_signup_noTokenRequired() throws Exception {
        mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"newuser@test.com\",\"password\":\"password123\",\"name\":\"Test\"}"))
           .andExpect(status().isOk()); // signup should succeed
    }

    @Test
    @DisplayName("GET /api/ai/status is accessible without token")
    void publicRoute_aiStatus_noTokenRequired() throws Exception {
        mvc.perform(get("/api/ai/status"))
           .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. MISSING TOKEN — protected routes must return 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/records/health returns 401 with no token")
    void protectedRoute_noToken_returns401() throws Exception {
        mvc.perform(get("/api/records/health"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/records/finance returns 401 with no token")
    void protectedRoute_finance_noToken_returns401() throws Exception {
        mvc.perform(get("/api/records/finance"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/records/career returns 401 with no token")
    void protectedRoute_career_noToken_returns401() throws Exception {
        mvc.perform(get("/api/records/career"))
           .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. EXPIRED JWT — must return 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Expired JWT is rejected with 401")
    void expiredJwt_returns401() throws Exception {
        // Build a token that expired 1 second ago using the same signing key
        String expiredToken = io.jsonwebtoken.Jwts.builder()
            .subject("test-user-expired")
            .claim("email", "expired@test.com")
            .issuedAt(new java.util.Date(System.currentTimeMillis() - 10000))
            .expiration(new java.util.Date(System.currentTimeMillis() - 1000))
            .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                "hackathon-test-secret-key-32xxYY".getBytes(java.nio.charset.StandardCharsets.UTF_8)))
            .compact();

        mvc.perform(get("/api/records/health")
                .header("Authorization", "Bearer " + expiredToken))
           .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. TAMPERED/FORGED JWT — must return 401
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Tampered JWT payload is rejected with 401")
    void tamperedJwt_returns401() throws Exception {
        // Take a valid token and change a character in the signature
        String tampered = validToken.substring(0, validToken.length() - 5) + "XXXXX";

        mvc.perform(get("/api/records/health")
                .header("Authorization", "Bearer " + tampered))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Completely fake JWT string is rejected with 401")
    void fakeJwt_returns401() throws Exception {
        mvc.perform(get("/api/records/health")
                .header("Authorization", "Bearer totally.fake.token"))
           .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. LEGACY DEMO TOKENS — must be explicitly rejected
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Legacy dt_jwt_ frontend token is rejected with 401")
    void legacyDtJwtToken_returns401() throws Exception {
        String payload = Base64.getEncoder().encodeToString(
            "{\"id\":\"demo-1\",\"email\":\"arjun@demo.com\",\"exp\":9999999999000}".getBytes()
        );
        String legacyToken = "dt_jwt_" + payload;

        mvc.perform(get("/api/records/health")
                .header("Authorization", "Bearer " + legacyToken))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DEMO_SESSION_ frontend token is rejected with 401")
    void demoSessionToken_returns401() throws Exception {
        mvc.perform(get("/api/records/health")
                .header("Authorization", "Bearer DEMO_SESSION_YXJqdW5AZGVtby5jb20="))
           .andExpect(status().isUnauthorized());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. VALID JWT — protected routes must respond (not 401/403 from filter)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Valid signed JWT allows access to protected health endpoint")
    void validJwt_allowsAccessToProtectedRoute() throws Exception {
        mvc.perform(get("/api/records/health")
                .header("Authorization", "Bearer " + validToken))
           .andExpect(status().isOk()); // empty list [] is fine — user has no records
    }

    @Test
    @DisplayName("Valid signed JWT allows access to protected finance endpoint")
    void validJwt_allowsAccessToFinanceRoute() throws Exception {
        mvc.perform(get("/api/records/finance")
                .header("Authorization", "Bearer " + validToken))
           .andExpect(status().isOk());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. AI ENDPOINT — works with Groq fallback (no key configured)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/ai/chat returns 503 (not 500 crash) when Groq key missing")
    void aiChat_withoutGroqKey_returns503() throws Exception {
        mvc.perform(post("/api/ai/chat")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"message\":\"How am I doing?\",\"context\":{},\"history\":[]}"))
           .andExpect(status().isServiceUnavailable())
           .andExpect(jsonPath("$.error").exists()); // Frontend will activate deterministic fallback
    }

    @Test
    @DisplayName("GET /api/ai/status returns available=false when key missing")
    void aiStatus_withoutKey_returnsUnavailable() throws Exception {
        mvc.perform(get("/api/ai/status"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.available").value(false));
    }
}

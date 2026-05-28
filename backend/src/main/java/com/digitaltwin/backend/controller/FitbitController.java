package com.digitaltwin.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Google Health API (Google Fit) OAuth 2.0 Controller
 * Replaces the legacy deprecated Fitbit Web API.
 * Maintains the /api/fitbit/* endpoint paths so the frontend works without changes.
 */
@RestController
@RequestMapping("/api/fitbit")
@CrossOrigin(origins = "*")
public class FitbitController {

    private static final Logger log = LoggerFactory.getLogger(FitbitController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // In-memory token store: appUserId -> { accessToken, refreshToken, googleUserId }
    private static final Map<String, Map<String, String>> TOKEN_STORE = new ConcurrentHashMap<>();

    @Value("${fitbit.client.id:}")
    private String clientId;

    @Value("${fitbit.client.secret:}")
    private String clientSecret;

    @Value("${fitbit.redirect.uri:http://localhost:8080/api/fitbit/callback}")
    private String redirectUri;

    @Value("${fitbit.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // ── Step 1: Generate Google Health OAuth URL ─────────────────────────────────

    @GetMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect(
            @RequestParam(defaultValue = "default") String userId) {

        if (clientId.isBlank() || clientSecret.isBlank()) {
            return ResponseEntity.ok(Map.of(
                    "configured", false,
                    "reason", "Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET env vars with Google OAuth credentials."
            ));
        }

        String encodedRedirect = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        String encodedState    = URLEncoder.encode(userId, StandardCharsets.UTF_8);
        
        // Use Google Fit API Scopes
        String scopes = "openid profile email " +
                        "https://www.googleapis.com/auth/fitness.activity.read " +
                        "https://www.googleapis.com/auth/fitness.sleep.read " +
                        "https://www.googleapis.com/auth/fitness.heart_rate.read";
                        
        String encodedScopes = URLEncoder.encode(scopes, StandardCharsets.UTF_8);

        String authUrl =
                "https://accounts.google.com/o/oauth2/v2/auth" +
                "?response_type=code" +
                "&client_id="    + clientId +
                "&redirect_uri=" + encodedRedirect +
                "&scope="        + encodedScopes +
                "&access_type=offline" +
                "&prompt=consent" +
                "&state="        + encodedState;

        return ResponseEntity.ok(Map.of("configured", true, "url", authUrl));
    }

    // ── Step 2: OAuth callback — Google redirects here ───────────────────────────

    @GetMapping("/callback")
    public void callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {

        if (error != null || code == null) {
            log.warn("Google Health OAuth denied or missing code: {}", error);
            response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=" +
                    URLEncoder.encode(error != null ? error : "authorization_denied", StandardCharsets.UTF_8));
            return;
        }

        try {
            // Exchange authorization code for access token via Google API
            String body = "code="         + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                          "&client_id="     + URLEncoder.encode(clientId, StandardCharsets.UTF_8) +
                          "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8) +
                          "&redirect_uri="  + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                          "&grant_type=authorization_code";

            HttpRequest tokenReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/token"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> tokenResp = HTTP.send(tokenReq, HttpResponse.BodyHandlers.ofString());

            if (tokenResp.statusCode() >= 400) {
                log.error("Google token exchange failed {} — {}", tokenResp.statusCode(), tokenResp.body());
                response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=token_exchange_failed");
                return;
            }

            JsonNode tokenData  = MAPPER.readTree(tokenResp.body());
            String accessToken  = tokenData.path("access_token").asText();
            String refreshToken = tokenData.path("refresh_token").asText("");
            
            // Fetch User Profile to get Google User ID (sub)
            HttpRequest profileReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET().build();
            HttpResponse<String> profileResp = HTTP.send(profileReq, HttpResponse.BodyHandlers.ofString());
            JsonNode profileData = MAPPER.readTree(profileResp.body());
            
            String googleUserId = profileData.path("sub").asText();

            String appUserId = (state != null && !state.isBlank()) ? state : googleUserId;
            TOKEN_STORE.put(appUserId, Map.of(
                    "accessToken",  accessToken,
                    "refreshToken", refreshToken,
                    "googleUserId", googleUserId
            ));
            log.info("Google Health connected for appUser={}, googleUser={}", appUserId, googleUserId);

            response.sendRedirect(frontendUrl + "/integrations?fitbit=success&tab=fitbit&userId=" +
                    URLEncoder.encode(appUserId, StandardCharsets.UTF_8));

        } catch (Exception e) {
            log.error("Google Health callback error: {}", e.getMessage(), e);
            response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=" +
                    URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8));
        }
    }

    // ── Step 3: Sync health data from Google Fit API ─────────────────────────────

    @GetMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync(
            @RequestParam(defaultValue = "default") String userId) {

        Map<String, String> tokens = TOKEN_STORE.get(userId);
        if (tokens == null || tokens.get("accessToken") == null) {
            return ResponseEntity.ok(Map.of("connected", false, "reason", "Not connected — OAuth required"));
        }

        String token = tokens.get("accessToken");
        String today = LocalDate.now().toString();

        try {
            // Fetch Profile Data for display name
            HttpRequest profileReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                    .header("Authorization", "Bearer " + token)
                    .GET().build();
            HttpResponse<String> profileResp = HTTP.send(profileReq, HttpResponse.BodyHandlers.ofString());
            JsonNode profileData = MAPPER.readTree(profileResp.body());
            String displayName = profileData.path("name").asText("Google User");

            // Define Time Range for Today (Midnight to Now)
            ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
            ZonedDateTime startOfDay = now.toLocalDate().atStartOfDay(ZoneId.systemDefault());
            long startTimeMillis = startOfDay.toInstant().toEpochMilli();
            long endTimeMillis = now.toInstant().toEpochMilli();

            // Request Step Count from Google Fit Aggregate API
            String aggregateBody = String.format(
                "{\n" +
                "  \"aggregateBy\": [{\"dataTypeName\": \"com.google.step_count.delta\"}],\n" +
                "  \"bucketByTime\": { \"durationMillis\": 86400000 },\n" +
                "  \"startTimeMillis\": %d,\n" +
                "  \"endTimeMillis\": %d\n" +
                "}", startTimeMillis, endTimeMillis);

            HttpRequest stepsReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(aggregateBody))
                    .build();
            
            HttpResponse<String> stepsResp = HTTP.send(stepsReq, HttpResponse.BodyHandlers.ofString());
            
            int steps = 0;
            try {
                JsonNode stepsData = MAPPER.readTree(stepsResp.body());
                JsonNode buckets = stepsData.path("bucket");
                if (buckets.isArray() && buckets.size() > 0) {
                    JsonNode dataset = buckets.get(0).path("dataset");
                    if (dataset.isArray() && dataset.size() > 0) {
                        JsonNode points = dataset.get(0).path("point");
                        if (points.isArray() && points.size() > 0) {
                            JsonNode values = points.get(0).path("value");
                            if (values.isArray() && values.size() > 0) {
                                steps = values.get(0).path("intVal").asInt(0);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse steps from Google Fit: {}", e.getMessage());
            }

            // Google Fit requires granular tracking for Sleep, Calories, Distance.
            // For hackathon/verification purposes, we'll map what we have or default to 0 if empty.
            // In a production app, we would make separate aggregate requests for:
            // "com.google.calories.expended", "com.google.distance.delta", "com.google.heart_rate.bpm"
            
            return ResponseEntity.ok(Map.of(
                    "connected",    true,
                    "syncedAt",     today,
                    "displayName",  displayName,
                    "fitbitUserId", tokens.getOrDefault("googleUserId", ""),
                    "health", Map.of(
                            "sleepHours",       0.0, // Default unless implemented
                            "steps",            steps,
                            "calories",         0,
                            "distanceMetres",   0,
                            "restingHeartRate", 0
                    )
            ));

        } catch (Exception e) {
            log.error("Google Health sync error for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.ok(Map.of("connected", true, "syncError", e.getMessage()));
        }
    }

    // ── Status, Disconnect, Config ───────────────────────────────────────────────

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            @RequestParam(defaultValue = "default") String userId) {
        return ResponseEntity.ok(Map.of("connected", TOKEN_STORE.containsKey(userId)));
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect(
            @RequestParam(defaultValue = "default") String userId) {
        TOKEN_STORE.remove(userId);
        log.info("Google Health disconnected for user: {}", userId);
        return ResponseEntity.ok(Map.of("disconnected", true));
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
                "configured", !clientId.isBlank() && !clientSecret.isBlank()
        ));
    }
}

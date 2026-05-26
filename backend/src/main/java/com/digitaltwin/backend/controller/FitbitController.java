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
import java.time.LocalDate;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fitbit OAuth 2.0 Controller
 *
 * Flow:
 *   1. GET  /api/fitbit/connect?userId=   → returns OAuth URL (or {configured:false})
 *   2. GET  /api/fitbit/callback?code=&state=  → exchanges code for token, redirects to frontend
 *   3. GET  /api/fitbit/sync?userId=      → fetches sleep/steps/heart-rate from Fitbit API
 *   4. GET  /api/fitbit/status?userId=    → connected check
 *   5. POST /api/fitbit/disconnect?userId= → removes stored token
 *
 * Register your app at https://dev.fitbit.com/apps/new
 * Set env vars: FITBIT_CLIENT_ID, FITBIT_CLIENT_SECRET
 * Redirect URI to register: http://localhost:8080/api/fitbit/callback
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

    // In-memory token store: appUserId -> { accessToken, refreshToken, fitbitUserId }
    // Tokens are lost on restart — fine for dev/hackathon; use DB for production.
    private static final Map<String, Map<String, String>> TOKEN_STORE = new ConcurrentHashMap<>();

    @Value("${fitbit.client.id:}")
    private String clientId;

    @Value("${fitbit.client.secret:}")
    private String clientSecret;

    @Value("${fitbit.redirect.uri:http://localhost:8080/api/fitbit/callback}")
    private String redirectUri;

    @Value("${fitbit.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // ── Step 1: Generate Fitbit OAuth URL ────────────────────────────────────────

    @GetMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect(
            @RequestParam(defaultValue = "default") String userId) {

        if (clientId.isBlank() || clientSecret.isBlank()) {
            return ResponseEntity.ok(Map.of(
                    "configured", false,
                    "reason", "Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET env vars. Register at https://dev.fitbit.com/apps/new"
            ));
        }

        String encodedRedirect = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);
        String encodedState    = URLEncoder.encode(userId, StandardCharsets.UTF_8);
        String authUrl =
                "https://www.fitbit.com/oauth2/authorize" +
                "?response_type=code" +
                "&client_id="    + clientId +
                "&redirect_uri=" + encodedRedirect +
                "&scope=activity+heartrate+sleep+profile+weight" +
                "&expires_in=604800" +
                "&state="        + encodedState;

        return ResponseEntity.ok(Map.of("configured", true, "url", authUrl));
    }

    // ── Step 2: OAuth callback — Fitbit redirects here ───────────────────────────

    @GetMapping("/callback")
    public void callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {

        if (error != null || code == null) {
            log.warn("Fitbit OAuth denied or missing code: {}", error);
            response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=" +
                    URLEncoder.encode(error != null ? error : "authorization_denied", StandardCharsets.UTF_8));
            return;
        }

        try {
            // Exchange authorization code for access token
            String credentials = Base64.getEncoder().encodeToString(
                    (clientId + ":" + clientSecret).getBytes(StandardCharsets.UTF_8));

            String body = "code="         + URLEncoder.encode(code, StandardCharsets.UTF_8) +
                          "&grant_type=authorization_code" +
                          "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8);

            HttpRequest tokenReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.fitbit.com/oauth2/token"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization",  "Basic " + credentials)
                    .header("Content-Type",   "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> tokenResp = HTTP.send(tokenReq, HttpResponse.BodyHandlers.ofString());

            if (tokenResp.statusCode() >= 400) {
                log.error("Fitbit token exchange failed {} — {}", tokenResp.statusCode(), tokenResp.body());
                response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=token_exchange_failed");
                return;
            }

            JsonNode tokenData  = MAPPER.readTree(tokenResp.body());
            String accessToken  = tokenData.path("access_token").asText();
            String refreshToken = tokenData.path("refresh_token").asText();
            String fitbitUserId = tokenData.path("user_id").asText();

            String appUserId = (state != null && !state.isBlank()) ? state : fitbitUserId;
            TOKEN_STORE.put(appUserId, Map.of(
                    "accessToken",  accessToken,
                    "refreshToken", refreshToken,
                    "fitbitUserId", fitbitUserId
            ));
            log.info("Fitbit connected for appUser={}, fitbitUser={}", appUserId, fitbitUserId);

            response.sendRedirect(frontendUrl + "/integrations?fitbit=success&tab=fitbit&userId=" +
                    URLEncoder.encode(appUserId, StandardCharsets.UTF_8));

        } catch (Exception e) {
            log.error("Fitbit callback error: {}", e.getMessage());
            response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=" +
                    URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8));
        }
    }

    // ── Step 3: Sync health data from Fitbit API ─────────────────────────────────

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
            String sleepJson   = fitbitGet(token, "/1.2/user/-/sleep/date/" + today + ".json");
            String actJson     = fitbitGet(token, "/1/user/-/activities/date/" + today + ".json");
            String hrJson      = fitbitGet(token, "/1/user/-/activities/heart/date/" + today + "/1d.json");
            String profileJson = fitbitGet(token, "/1/user/-/profile.json");

            // Parse sleep hours
            double sleepHours = 0;
            try {
                JsonNode sleep = MAPPER.readTree(sleepJson);
                double mins = sleep.path("summary").path("totalMinutesAsleep").asDouble(0);
                sleepHours  = Math.round((mins / 60.0) * 10.0) / 10.0;
            } catch (Exception ignored) {}

            // Parse steps & calories
            int steps    = 0;
            int calories = 0;
            int distance = 0;
            try {
                JsonNode act = MAPPER.readTree(actJson);
                JsonNode sum = act.path("summary");
                steps    = sum.path("steps").asInt(0);
                calories = sum.path("caloriesOut").asInt(0);
                distance = (int) (sum.path("distances").get(0).path("distance").asDouble(0) * 1000); // metres
            } catch (Exception ignored) {}

            // Parse resting heart rate
            int restingHR = 0;
            try {
                JsonNode hr    = MAPPER.readTree(hrJson);
                JsonNode daily = hr.path("activities-heart");
                if (daily.isArray() && daily.size() > 0) {
                    restingHR = daily.get(0).path("value").path("restingHeartRate").asInt(0);
                }
            } catch (Exception ignored) {}

            // Parse profile display name
            String displayName = "";
            try {
                JsonNode profile = MAPPER.readTree(profileJson);
                displayName = profile.path("user").path("displayName").asText("");
            } catch (Exception ignored) {}

            return ResponseEntity.ok(Map.of(
                    "connected",    true,
                    "syncedAt",     today,
                    "displayName",  displayName,
                    "fitbitUserId", tokens.getOrDefault("fitbitUserId", ""),
                    "health", Map.of(
                            "sleepHours",       sleepHours,
                            "steps",            steps,
                            "calories",         calories,
                            "distanceMetres",   distance,
                            "restingHeartRate", restingHR
                    )
            ));

        } catch (Exception e) {
            log.error("Fitbit sync error for user {}: {}", userId, e.getMessage());
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
        log.info("Fitbit disconnected for user: {}", userId);
        return ResponseEntity.ok(Map.of("disconnected", true));
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
                "configured", !clientId.isBlank() && !clientSecret.isBlank()
        ));
    }

    // ── Helper ───────────────────────────────────────────────────────────────────

    private String fitbitGet(String accessToken, String path) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.fitbit.com" + path))
                .timeout(Duration.ofSeconds(8))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();
        return HTTP.send(req, HttpResponse.BodyHandlers.ofString()).body();
    }
}

package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.FitbitToken;
import com.digitaltwin.backend.repository.FitbitTokenRepository;
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
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * Google Fit OAuth 2.0 Controller — syncs steps, calories, heart rate, sleep, distance.
 * Endpoint prefix kept as /api/fitbit so the frontend needs no changes.
 */
@RestController
@RequestMapping("/api/fitbit")
@CrossOrigin(origins = "*")
public class FitbitController {

    private static final Logger log = LoggerFactory.getLogger(FitbitController.class);
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(12))
            .build();

    // RFC-3339 formatter required by the Sessions API
    private static final DateTimeFormatter RFC3339 =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                    .withZone(ZoneId.of("UTC"));

    // ── DB-backed token store ─────────────────────────────────────────────────
    private final FitbitTokenRepository tokenRepo;

    public FitbitController(FitbitTokenRepository tokenRepo) {
        this.tokenRepo = tokenRepo;
    }

    @Value("${fitbit.client.id:}")
    private String clientId;

    @Value("${fitbit.client.secret:}")
    private String clientSecret;

    @Value("${fitbit.redirect.uri:http://localhost:8080/api/fitbit/callback}")
    private String redirectUri;

    @Value("${fitbit.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // ── Step 1: Build Google OAuth URL ───────────────────────────────────────────

    @GetMapping("/connect")
    public ResponseEntity<Map<String, Object>> connect(
            @RequestParam(defaultValue = "default") String userId) {

        if (clientId.isBlank() || clientSecret.isBlank()) {
            return ResponseEntity.ok(Map.of(
                    "configured", false,
                    "reason", "Set FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET env vars with Google OAuth credentials."));
        }

        String scopes = "openid profile email " +
                "https://www.googleapis.com/auth/fitness.activity.read " +
                "https://www.googleapis.com/auth/fitness.sleep.read " +
                "https://www.googleapis.com/auth/fitness.heart_rate.read " +
                "https://www.googleapis.com/auth/fitness.body.read";

        String authUrl = "https://accounts.google.com/o/oauth2/v2/auth" +
                "?response_type=code" +
                "&client_id="    + clientId +
                "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8) +
                "&scope="        + URLEncoder.encode(scopes, StandardCharsets.UTF_8) +
                "&access_type=offline" +
                "&prompt=consent" +
                "&state="        + URLEncoder.encode(userId, StandardCharsets.UTF_8);

        return ResponseEntity.ok(Map.of("configured", true, "url", authUrl));
    }

    // ── Step 2: OAuth callback ────────────────────────────────────────────────────

    @GetMapping("/callback")
    public void callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {

        if (error != null || code == null) {
            log.warn("Google Fit OAuth denied: {}", error);
            response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=" +
                    URLEncoder.encode(error != null ? error : "authorization_denied", StandardCharsets.UTF_8));
            return;
        }

        try {
            // Exchange auth code for tokens
            String body = "code="           + URLEncoder.encode(code,         StandardCharsets.UTF_8) +
                          "&client_id="     + URLEncoder.encode(clientId,     StandardCharsets.UTF_8) +
                          "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8) +
                          "&redirect_uri="  + URLEncoder.encode(redirectUri,  StandardCharsets.UTF_8) +
                          "&grant_type=authorization_code";

            HttpRequest tokenReq = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/token"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> tokenResp = HTTP.send(tokenReq, HttpResponse.BodyHandlers.ofString());
            if (tokenResp.statusCode() >= 400) {
                log.error("Token exchange failed {}: {}", tokenResp.statusCode(), tokenResp.body());
                response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=token_exchange_failed");
                return;
            }

            JsonNode tokenData  = MAPPER.readTree(tokenResp.body());
            String accessToken  = tokenData.path("access_token").asText();
            String refreshToken = tokenData.path("refresh_token").asText("");

            // Get Google user ID from userinfo endpoint
            JsonNode profileData = getJson("https://www.googleapis.com/oauth2/v3/userinfo", accessToken);
            String googleUserId  = profileData.path("sub").asText();
            String appUserId     = (state != null && !state.isBlank()) ? state : googleUserId;

            // Persist tokens to DB (upsert — same userId just overwrites the row)
            tokenRepo.save(FitbitToken.builder()
                    .userId(appUserId)
                    .accessToken(accessToken)
                    .refreshToken(refreshToken.isBlank() ? null : refreshToken)
                    .googleUserId(googleUserId)
                    .updatedAt(LocalDateTime.now())
                    .build());

            log.info("Google Fit connected: appUser={}, googleUser={}", appUserId, googleUserId);
            response.sendRedirect(frontendUrl + "/integrations?fitbit=success&tab=fitbit&userId=" +
                    URLEncoder.encode(appUserId, StandardCharsets.UTF_8));

        } catch (Exception e) {
            log.error("Callback error: {}", e.getMessage(), e);
            response.sendRedirect(frontendUrl + "/integrations?fitbit=error&tab=fitbit&msg=" +
                    URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8));
        }
    }

    // ── Step 3: Full sync — steps, calories, heart rate, sleep, distance ─────────

    @GetMapping("/sync")
    public ResponseEntity<Map<String, Object>> sync(
            @RequestParam(defaultValue = "default") String userId) {

        Optional<FitbitToken> tokenOpt = tokenRepo.findById(userId);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("connected", false, "reason", "Not connected — OAuth required"));
        }

        FitbitToken tokenRecord = tokenOpt.get();
        String token = tokenRecord.getAccessToken();
        String today = LocalDate.now().toString();

        try {
            // Display name
            JsonNode profile    = getJson("https://www.googleapis.com/oauth2/v3/userinfo", token);
            String displayName  = profile.path("name").asText("Google User");

            // Time window: start of today → now (for steps/calories/HR)
            ZonedDateTime now        = ZonedDateTime.now(ZoneId.systemDefault());
            ZonedDateTime startOfDay = now.toLocalDate().atStartOfDay(ZoneId.systemDefault());
            long startMs = startOfDay.toInstant().toEpochMilli();
            long endMs   = now.toInstant().toEpochMilli();

            // ── Steps ────────────────────────────────────────────────────────────
            int steps = 0;
            try {
                JsonNode stepsData = aggregateFit("com.google.step_count.delta", startMs, endMs, token);
                steps = extractIntVal(stepsData);
            } catch (Exception e) {
                log.warn("Steps fetch failed: {}", e.getMessage());
            }

            // ── Calories ─────────────────────────────────────────────────────────
            int calories = 0;
            try {
                JsonNode calData = aggregateFit("com.google.calories.expended", startMs, endMs, token);
                calories = (int) Math.round(extractFpVal(calData));
            } catch (Exception e) {
                log.warn("Calories fetch failed: {}", e.getMessage());
            }

            // ── Resting heart rate ────────────────────────────────────────────────
            // Google Fit reports resting HR via com.google.heart_rate.bpm aggregate (daily min ≈ resting)
            int restingHeartRate = 0;
            try {
                JsonNode hrData = aggregateFit("com.google.heart_rate.bpm", startMs, endMs, token);
                // The aggregate returns min/max/avg fpVal — we use the minimum as resting approximation
                restingHeartRate = (int) Math.round(extractFpValMin(hrData));
            } catch (Exception e) {
                log.warn("Heart rate fetch failed: {}", e.getMessage());
            }

            // ── Distance (metres) ────────────────────────────────────────────────
            int distanceMetres = 0;
            try {
                JsonNode distData = aggregateFit("com.google.distance.delta", startMs, endMs, token);
                distanceMetres = (int) Math.round(extractFpVal(distData));
            } catch (Exception e) {
                log.warn("Distance fetch failed: {}", e.getMessage());
            }

            // ── Sleep (last night: yesterday noon → now) ──────────────────────────
            // Sleep sessions typically cross midnight so we look back 20 hours from now.
            double sleepHours = 0.0;
            try {
                // Look back 20 hours to capture last night's sleep
                ZonedDateTime sleepWindowStart = now.minusHours(20);
                String sleepStart = RFC3339.format(sleepWindowStart.withZoneSameInstant(ZoneId.of("UTC")));
                String sleepEnd   = RFC3339.format(now.withZoneSameInstant(ZoneId.of("UTC")));

                String sessionsUrl = "https://www.googleapis.com/fitness/v1/users/me/sessions" +
                        "?startTime=" + URLEncoder.encode(sleepStart, StandardCharsets.UTF_8) +
                        "&endTime="   + URLEncoder.encode(sleepEnd,   StandardCharsets.UTF_8) +
                        "&activityType=72";   // 72 = in_bed (covers all sleep sub-types)

                JsonNode sessionsData = getJson(sessionsUrl, token);
                JsonNode sessions     = sessionsData.path("session");

                long totalSleepMs = 0;
                if (sessions.isArray()) {
                    for (JsonNode session : sessions) {
                        long sessionStart = session.path("startTimeMillis").asLong(0);
                        long sessionEnd   = session.path("endTimeMillis").asLong(0);
                        // Sanity check: only count sessions between 1 min and 12 hours
                        long durationMs = sessionEnd - sessionStart;
                        if (durationMs > 60_000 && durationMs < 43_200_000L) {
                            totalSleepMs += durationMs;
                        }
                    }
                }

                // If no in_bed session found, try activityType=109/110/111 (light/deep/REM)
                if (totalSleepMs == 0) {
                    for (int sleepType : new int[]{109, 110, 111}) {
                        String url2 = "https://www.googleapis.com/fitness/v1/users/me/sessions" +
                                "?startTime=" + URLEncoder.encode(sleepStart, StandardCharsets.UTF_8) +
                                "&endTime="   + URLEncoder.encode(sleepEnd,   StandardCharsets.UTF_8) +
                                "&activityType=" + sleepType;
                        JsonNode d2 = getJson(url2, token);
                        JsonNode s2 = d2.path("session");
                        if (s2.isArray()) {
                            for (JsonNode s : s2) {
                                long dur = s.path("endTimeMillis").asLong(0) - s.path("startTimeMillis").asLong(0);
                                if (dur > 60_000 && dur < 43_200_000L) totalSleepMs += dur;
                            }
                        }
                    }
                }

                // Convert ms to hours, round to 1 decimal
                sleepHours = Math.round((totalSleepMs / 3_600_000.0) * 10.0) / 10.0;
                log.info("Sleep synced: {}h from {} sessions", sleepHours, sessions.isArray() ? sessions.size() : 0);

            } catch (Exception e) {
                log.warn("Sleep fetch failed: {}", e.getMessage());
            }

            log.info("Sync complete for {}: steps={} cal={} hr={} dist={}m sleep={}h",
                    userId, steps, calories, restingHeartRate, distanceMetres, sleepHours);

            return ResponseEntity.ok(Map.of(
                    "connected",    true,
                    "syncedAt",     today,
                    "displayName",  displayName,
                    "fitbitUserId", tokenRecord.getGoogleUserId() != null ? tokenRecord.getGoogleUserId() : "",
                    "health", Map.of(
                            "sleepHours",       sleepHours,
                            "steps",            steps,
                            "calories",         calories,
                            "distanceMetres",   distanceMetres,
                            "restingHeartRate", restingHeartRate
                    )
            ));

        } catch (Exception e) {
            log.error("Sync error for user {}: {}", userId, e.getMessage(), e);
            // If it's an auth error and we have a refresh token, try to get a new access token
            FitbitToken tr = tokenRepo.findById(userId).orElse(null);
            if (tr != null && tr.getRefreshToken() != null && e.getMessage() != null
                    && (e.getMessage().contains("401") || e.getMessage().contains("Unauthorized"))) {
                try {
                    String newAccessToken = refreshAccessToken(tr.getRefreshToken());
                    tr.setAccessToken(newAccessToken);
                    tr.setUpdatedAt(LocalDateTime.now());
                    tokenRepo.save(tr);
                    log.info("Access token refreshed and persisted for user {}", userId);
                } catch (Exception refreshEx) {
                    log.warn("Token refresh also failed for user {}: {}", userId, refreshEx.getMessage());
                }
            }
            return ResponseEntity.ok(Map.of("connected", true, "syncError", e.getMessage()));
        }
    }

    // ── Status / Disconnect / Config ─────────────────────────────────────────────

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            @RequestParam(defaultValue = "default") String userId) {
        return ResponseEntity.ok(Map.of("connected", tokenRepo.existsById(userId)));
    }

    @PostMapping("/disconnect")
    public ResponseEntity<Map<String, Object>> disconnect(
            @RequestParam(defaultValue = "default") String userId) {
        tokenRepo.deleteById(userId);
        log.info("Google Fit disconnected: {}", userId);
        return ResponseEntity.ok(Map.of("disconnected", true));
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of("configured", !clientId.isBlank() && !clientSecret.isBlank()));
    }

    // ── Private helpers ───────────────────────────────────────────────────────────

    /** GET a JSON endpoint with a Bearer token. */
    private JsonNode getJson(String url, String token) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + token)
                .GET().build();
        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("Google API " + resp.statusCode() + ": " + resp.body());
        }
        return MAPPER.readTree(resp.body());
    }

    /**
     * Use the stored refresh token to obtain a new Google access token.
     * Called automatically when sync() receives a 401 from the Google API.
     */
    private String refreshAccessToken(String refreshToken) throws Exception {
        String body = "client_id="     + URLEncoder.encode(clientId,     StandardCharsets.UTF_8) +
                      "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8) +
                      "&refresh_token=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8) +
                      "&grant_type=refresh_token";

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("Token refresh failed " + resp.statusCode() + ": " + resp.body());
        }
        JsonNode data = MAPPER.readTree(resp.body());
        return data.path("access_token").asText();
    }

    /** POST to the Google Fit Aggregate API for a single data type over a time window. */
    private JsonNode aggregateFit(String dataTypeName, long startMs, long endMs, String token) throws Exception {
        String body = String.format(
                "{\"aggregateBy\":[{\"dataTypeName\":\"%s\"}]," +
                "\"bucketByTime\":{\"durationMillis\":86400000}," +
                "\"startTimeMillis\":%d,\"endTimeMillis\":%d}",
                dataTypeName, startMs, endMs);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate"))
                .timeout(Duration.ofSeconds(10))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("Aggregate API " + resp.statusCode() + " for " + dataTypeName);
        }
        return MAPPER.readTree(resp.body());
    }

    /**
     * Extract the first intVal from a Google Fit aggregate response.
     * Used for step count.
     */
    private int extractIntVal(JsonNode data) {
        try {
            for (JsonNode bucket : data.path("bucket")) {
                for (JsonNode dataset : bucket.path("dataset")) {
                    for (JsonNode point : dataset.path("point")) {
                        JsonNode values = point.path("value");
                        if (values.isArray() && !values.isEmpty()) {
                            int v = values.get(0).path("intVal").asInt(0);
                            if (v > 0) return v;
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("extractIntVal failed: {}", e.getMessage());
        }
        return 0;
    }

    /**
     * Extract the sum of all fpVal points from a Google Fit aggregate response.
     * Used for calories and distance (summed across activity buckets).
     */
    private double extractFpVal(JsonNode data) {
        double total = 0;
        try {
            for (JsonNode bucket : data.path("bucket")) {
                for (JsonNode dataset : bucket.path("dataset")) {
                    for (JsonNode point : dataset.path("point")) {
                        JsonNode values = point.path("value");
                        if (values.isArray() && !values.isEmpty()) {
                            total += values.get(0).path("fpVal").asDouble(0);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("extractFpVal failed: {}", e.getMessage());
        }
        return total;
    }

    /**
     * Extract the MINIMUM fpVal from a Google Fit aggregate response.
     * Heart rate aggregate returns min/max/avg — minimum approximates resting HR.
     * The aggregate for heart_rate.bpm returns values[0]=min, values[1]=max, values[2]=avg.
     */
    private double extractFpValMin(JsonNode data) {
        double min = Double.MAX_VALUE;
        boolean found = false;
        try {
            for (JsonNode bucket : data.path("bucket")) {
                for (JsonNode dataset : bucket.path("dataset")) {
                    for (JsonNode point : dataset.path("point")) {
                        JsonNode values = point.path("value");
                        if (values.isArray() && !values.isEmpty()) {
                            // values[0] = min, values[1] = max, values[2] = avg
                            double v = values.get(0).path("fpVal").asDouble(0);
                            if (v > 0) { min = Math.min(min, v); found = true; }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("extractFpValMin failed: {}", e.getMessage());
        }
        return found ? min : 0;
    }
}

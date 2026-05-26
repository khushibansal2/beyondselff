package com.digitaltwin.backend.controller;

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
import java.util.List;
import java.util.Map;

/**
 * Job Proxy Controller
 *
 * Proxies requests to job APIs that require secret keys, keeping those keys
 * out of the browser bundle. Falls back gracefully (returns empty results)
 * when keys are not configured — the frontend free-tier APIs still work.
 *
 * Endpoints:
 *   GET  /api/jobs/adzuna  ?query=&country=in
 *   POST /api/jobs/jooble  body: {keywords, location, page}
 *   GET  /api/jobs/salary  ?role=
 *
 * Set environment variables before starting the backend:
 *   ADZUNA_APP_ID  — from developer.adzuna.com
 *   ADZUNA_APP_KEY — from developer.adzuna.com
 *   JOOBLE_API_KEY — from jooble.org/api/index (aggregates Naukri/Shine/TimesJobs/LinkedIn India)
 */
@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = "*")
public class JobProxyController {

    private static final Logger log = LoggerFactory.getLogger(JobProxyController.class);

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${adzuna.app.id:}")
    private String adzunaAppId;

    @Value("${adzuna.app.key:}")
    private String adzunaAppKey;

    @Value("${jooble.api.key:}")
    private String joobleApiKey;

    // ── Adzuna ──────────────────────────────────────────────────────────────────

    /**
     * GET /api/jobs/adzuna?query=react+developer&country=in&page=1
     * Returns raw Adzuna JSON forwarded to the frontend for normalization.
     */
    @GetMapping("/adzuna")
    public ResponseEntity<String> searchAdzuna(
            @RequestParam(defaultValue = "software engineer") String query,
            @RequestParam(defaultValue = "in") String country,
            @RequestParam(defaultValue = "1") int page) {

        if (adzunaAppId.isBlank() || adzunaAppKey.isBlank()) {
            log.debug("Adzuna keys not configured — returning empty results");
            return ResponseEntity.ok("{\"results\":[]}");
        }

        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            String url = String.format(
                    "https://api.adzuna.com/v1/api/jobs/%s/search/%d" +
                    "?app_id=%s&app_key=%s&what=%s&results_per_page=15&content-type=application/json",
                    country, page, adzunaAppId, adzunaAppKey, encoded);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.warn("Adzuna returned {}", resp.statusCode());
                return ResponseEntity.ok("{\"results\":[]}");
            }
            return ResponseEntity.ok(resp.body());

        } catch (IOException | InterruptedException e) {
            log.error("Adzuna proxy error: {}", e.getMessage());
            return ResponseEntity.ok("{\"results\":[]}");
        }
    }

    // ── Jooble (aggregates Naukri, Shine, TimesJobs, LinkedIn India) ───────────

    /**
     * POST /api/jobs/jooble
     * Body (JSON): { "keywords": "react developer", "location": "India", "page": 1 }
     * Jooble aggregates Indian job portals — best source for IN roles.
     * Get a free key at https://jooble.org/api/index
     */
    @PostMapping("/jooble")
    public ResponseEntity<String> searchJooble(@RequestBody(required = false) Map<String, Object> body) {

        if (joobleApiKey.isBlank()) {
            log.debug("Jooble key not configured — returning empty results");
            return ResponseEntity.ok("{\"jobs\":[]}");
        }

        String keywords = body != null && body.get("keywords") != null ? String.valueOf(body.get("keywords")) : "software engineer";
        String location = body != null && body.get("location") != null ? String.valueOf(body.get("location")) : "India";
        int    page     = body != null && body.get("page")     != null ? Integer.parseInt(String.valueOf(body.get("page"))) : 1;

        try {
            String requestBody = String.format(
                    "{\"keywords\":\"%s\",\"location\":\"%s\",\"page\":%d}",
                    keywords.replace("\"", "\\\""), location.replace("\"", "\\\""), page);

            String url = "https://jooble.org/api/" + URLEncoder.encode(joobleApiKey, StandardCharsets.UTF_8);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(12))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 400) {
                log.warn("Jooble returned {}", resp.statusCode());
                return ResponseEntity.ok("{\"jobs\":[]}");
            }
            return ResponseEntity.ok(resp.body());

        } catch (IOException | InterruptedException e) {
            log.error("Jooble proxy error: {}", e.getMessage());
            return ResponseEntity.ok("{\"jobs\":[]}");
        }
    }

    // ── Salary endpoint ─────────────────────────────────────────────────────────

    /**
     * GET /api/jobs/salary?role=senior+software+engineer
     * Tries Adzuna's histogram endpoint for real salary data.
     * Returns { "available": false } if keys are missing.
     */
    @GetMapping("/salary")
    public ResponseEntity<Object> getSalaryData(
            @RequestParam(defaultValue = "software engineer") String role) {

        if (adzunaAppId.isBlank() || adzunaAppKey.isBlank()) {
            return ResponseEntity.ok(Map.of("available", false, "reason", "Adzuna keys not configured"));
        }

        try {
            String encoded = URLEncoder.encode(role, StandardCharsets.UTF_8);
            String url = String.format(
                    "https://api.adzuna.com/v1/api/jobs/in/histogram" +
                    "?app_id=%s&app_key=%s&what=%s&content-type=application/json",
                    adzunaAppId, adzunaAppKey, encoded);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.ok(Map.of(
                    "available", resp.statusCode() < 400,
                    "raw",       resp.body()
            ));

        } catch (IOException | InterruptedException e) {
            log.error("Salary proxy error: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("available", false, "reason", e.getMessage()));
        }
    }

    // ── Health check ────────────────────────────────────────────────────────────

    /** GET /api/jobs/config — reveals which keys are configured (values redacted). */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> config() {
        return ResponseEntity.ok(Map.of(
                "adzuna",  !adzunaAppId.isBlank() && !adzunaAppKey.isBlank(),
                "jooble",  !joobleApiKey.isBlank(),
                "freeTierActive", true
        ));
    }
}

package com.digitaltwin.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
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

/**
 * Coursera Catalog Proxy
 *
 * Proxies searches to Coursera's public REST API (courses.v1).
 * The Coursera catalog API is free and requires no API key, but its
 * CORS policy blocks direct browser requests — this controller acts as
 * the server-side bridge.
 *
 * Endpoint:
 *   GET /api/coursera/search?query=python&limit=20
 *
 * Returns raw Coursera JSON:
 *   { "elements": [...], "linked": { "partners.v1": [...] } }
 *
 * The frontend (courseraService.js) normalises the response.
 */
@RestController
@RequestMapping("/api/coursera")
@CrossOrigin(origins = "*")
public class CourseraProxyController {

    private static final Logger log = LoggerFactory.getLogger(CourseraProxyController.class);

    private static final String COURSERA_BASE = "https://api.coursera.org/api";
    private static final String FIELDS        = "name,slug,photoUrl,description,domainTypes,courseType,level,partners";
    private static final String INCLUDES      = "partners.v1";
    private static final String EMPTY         = "{\"elements\":[],\"linked\":{}}";

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    /**
     * GET /api/coursera/search?query=machine+learning&limit=20
     *
     * Forwards the request to Coursera's courses.v1 search endpoint and
     * returns the raw JSON response. Returns an empty element list on any
     * error so the frontend degrades gracefully.
     */
    @GetMapping("/search")
    public ResponseEntity<String> searchCourses(
            @RequestParam String query,
            @RequestParam(defaultValue = "20") int limit) {

        if (query == null || query.isBlank()) {
            return ResponseEntity.ok(EMPTY);
        }

        try {
            String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
            int    safeLimit    = Math.min(Math.max(limit, 1), 50);

            String url = COURSERA_BASE + "/courses.v1"
                    + "?q=search"
                    + "&query="    + encodedQuery
                    + "&fields="   + FIELDS
                    + "&includes=" + INCLUDES
                    + "&limit="    + safeLimit
                    + "&language=en";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(15))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() >= 400) {
                log.warn("Coursera API returned {} for query='{}'", resp.statusCode(), query);
                return ResponseEntity.ok(EMPTY);
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(resp.body());

        } catch (IOException | InterruptedException e) {
            log.error("Coursera proxy error for query='{}': {}", query, e.getMessage());
            return ResponseEntity.ok(EMPTY);
        }
    }

    /** GET /api/coursera/health — quick liveness check */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\":\"ok\",\"source\":\"api.coursera.org\"}");
    }
}

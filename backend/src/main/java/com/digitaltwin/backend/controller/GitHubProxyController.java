package com.digitaltwin.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * GitHub API proxy — keeps GITHUB_TOKEN server-side only.
 *
 * GET /api/github/user/{username}        → GET https://api.github.com/users/:username
 * GET /api/github/user/{username}/repos  → GET https://api.github.com/users/:username/repos?per_page=100&sort=updated
 *
 * Requires JWT auth (protected by JwtAuthFilter).
 */
@RestController
@RequestMapping("/api/github")
public class GitHubProxyController {

    private static final Logger log = LoggerFactory.getLogger(GitHubProxyController.class);
    private static final String GITHUB_API = "https://api.github.com";

    @Value("${github.token:}")
    private String githubToken;

    private final RestTemplate restTemplate = new RestTemplate();

    private HttpHeaders ghHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept", "application/vnd.github.v3+json");
        if (githubToken != null && !githubToken.isBlank()) {
            headers.setBearerAuth(githubToken);
        }
        return headers;
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<Object> getUser(@PathVariable String username) {
        try {
            ResponseEntity<Object> res = restTemplate.exchange(
                GITHUB_API + "/users/" + username,
                HttpMethod.GET,
                new HttpEntity<>(ghHeaders()),
                Object.class
            );
            return ResponseEntity.ok(res.getBody());
        } catch (HttpClientErrorException e) {
            log.warn("GitHub user fetch failed for {}: {}", username, e.getStatusCode());
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("GitHub proxy error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "GitHub API call failed: " + e.getMessage()));
        }
    }

    @GetMapping("/user/{username}/repos")
    public ResponseEntity<Object> getRepos(@PathVariable String username) {
        try {
            ResponseEntity<Object> res = restTemplate.exchange(
                GITHUB_API + "/users/" + username + "/repos?per_page=100&sort=updated",
                HttpMethod.GET,
                new HttpEntity<>(ghHeaders()),
                Object.class
            );
            return ResponseEntity.ok(res.getBody());
        } catch (HttpClientErrorException e) {
            log.warn("GitHub repos fetch failed for {}: {}", username, e.getStatusCode());
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("GitHub proxy error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", "GitHub API call failed: " + e.getMessage()));
        }
    }
}

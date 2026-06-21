package com.digitaltwin.backend.controller;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Groq Proxy Controller — keeps the GROQ_API_KEY server-side only.
 *
 * Frontend calls POST /api/groq/chat with { model, messages, max_tokens, temperature }.
 * This endpoint requires JWT authentication (not in PUBLIC_PREFIXES).
 * Rate-limited to 15 requests/minute per IP.
 *
 * Configure GROQ_API_KEY in application.properties (never in frontend env).
 */
@RestController
@RequestMapping("/api/groq")
public class GroqProxyController {

    private static final Logger log = LoggerFactory.getLogger(GroqProxyController.class);
    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

    @Value("${groq.api.key:}")
    private String groqApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket getBucket(String ip) {
        return buckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.builder()
                    .capacity(15)
                    .refillGreedy(15, Duration.ofMinutes(1))
                    .build())
                .build()
        );
    }

    /**
     * POST /api/groq/chat
     * Forwards the request to Groq using the server-side API key.
     * Body: { model, messages, max_tokens, temperature }
     */
    @PostMapping("/chat")
    public ResponseEntity<Object> chat(
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest httpReq) {

        String ip = httpReq.getRemoteAddr();
        if (!getBucket(ip).tryConsume(1)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("error", "Rate limit exceeded. Max 15 Groq requests per minute."));
        }

        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("GROQ_API_KEY not configured in application.properties");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "Groq API key not configured on server. Set GROQ_API_KEY in application.properties."));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Object> response = restTemplate.exchange(
                GROQ_API_URL, HttpMethod.POST, entity, Object.class
            );
            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            log.error("Groq proxy error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "Groq API call failed: " + e.getMessage()));
        }
    }
}

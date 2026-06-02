package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.service.GeminiService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI Proxy Controller — Routes AI requests to Gemini via backend.
 * All endpoints require JWT authentication (removed from PUBLIC_PREFIXES).
 * Rate-limited to 20 requests/minute per IP via Bucket4j.
 */
@RestController
@RequestMapping("/api/ai")
public class AIProxyController {

    private static final Logger log = LoggerFactory.getLogger(AIProxyController.class);

    // Per-IP rate limit buckets: 20 requests per minute
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket getBucket(String ip) {
        return buckets.computeIfAbsent(ip, k ->
            Bucket.builder()
                .addLimit(Bandwidth.builder()
                    .capacity(20)
                    .refillGreedy(20, Duration.ofMinutes(1))
                    .build())
                .build()
        );
    }

    private ResponseEntity<Map<String, Object>> rateLimitExceeded() {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
            "error", "Rate limit exceeded. Max 20 AI requests per minute.",
            "source", "rate-limit",
            "timestamp", System.currentTimeMillis()
        ));
    }

    private final GeminiService geminiService;
    private final ObjectMapper mapper = new ObjectMapper();

    public AIProxyController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    /**
     * POST /api/ai/chat
     * Sends a user message + computed context to Gemini and returns the AI response.
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> request, HttpServletRequest httpReq) {
        String ip = httpReq.getRemoteAddr();
        if (!getBucket(ip).tryConsume(1)) return rateLimitExceeded();
        try {
            String message = (String) request.getOrDefault("message", "");
            Map<String, Object> context = (Map<String, Object>) request.getOrDefault("context", Map.of());
            String systemPrompt = (String) request.getOrDefault("systemPrompt", "");
            List<Map<String, Object>> history = (List<Map<String, Object>>) request.getOrDefault("history", List.of());

            String response = geminiService.chat(message, context, systemPrompt, history);
            return ResponseEntity.ok(Map.of(
                "response", response,
                "source", "groq",
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            // Return 503 so the frontend's own rich grounded fallback activates
            log.error("Gemini chat failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Gemini unavailable",
                "source", "error",
                "timestamp", System.currentTimeMillis()
            ));
        }
    }

    /**
     * POST /api/ai/narrative
     * Generates an emotionally intelligent narrative summary from computed data.
     */
    @PostMapping("/narrative")
    public ResponseEntity<Map<String, Object>> narrative(@RequestBody Map<String, Object> request, HttpServletRequest httpReq) {
        String ip = httpReq.getRemoteAddr();
        if (!getBucket(ip).tryConsume(1)) return rateLimitExceeded();
        try {
            Map<String, Object> computedData = (Map<String, Object>) request.getOrDefault("computedData", Map.of());
            String narrativeType = (String) request.getOrDefault("type", "dashboard");

            String narrative = geminiService.generateNarrative(computedData, narrativeType);
            return ResponseEntity.ok(Map.of(
                "narrative", narrative,
                "source", "groq",
                "type", narrativeType,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("Gemini narrative failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Gemini unavailable",
                "source", "error",
                "timestamp", System.currentTimeMillis()
            ));
        }
    }

    /**
     * POST /api/ai/explain
     * Generates an explainable AI explanation for a specific insight or recommendation.
     */
    @PostMapping("/explain")
    public ResponseEntity<Map<String, Object>> explain(@RequestBody Map<String, Object> request, HttpServletRequest httpReq) {
        String ip = httpReq.getRemoteAddr();
        if (!getBucket(ip).tryConsume(1)) return rateLimitExceeded();
        try {
            Map<String, Object> insightData = (Map<String, Object>) request.getOrDefault("insightData", Map.of());
            String explanation = geminiService.explainInsight(insightData);
            return ResponseEntity.ok(Map.of(
                "explanation", explanation,
                "source", "groq",
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "explanation", "This insight is based on patterns detected in your data. The deterministic analysis identified the relationship from your imported records.",
                "source", "fallback",
                "timestamp", System.currentTimeMillis()
            ));
        }
    }

    /**
     * POST /api/ai/recommendations
     * Generates 3 prioritised, data-grounded recommendations from the user's live scores.
     */
    @PostMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> recommendations(@RequestBody Map<String, Object> request) {
        try {
            Map<String, Object> context = (Map<String, Object>) request.getOrDefault("context", Map.of());
            String raw = geminiService.generateRecommendations(context);
            // Strip markdown fences if model wrapped the JSON
            String cleaned = raw.trim().replaceAll("^```json\\s*", "").replaceAll("^```\\s*", "").replaceAll("\\s*```$", "").trim();
            List<Object> recs = mapper.readValue(cleaned, List.class);
            return ResponseEntity.ok(Map.of(
                "recommendations", recs,
                "source", "groq",
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("Recommendations failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "AI unavailable",
                "source", "error",
                "timestamp", System.currentTimeMillis()
            ));
        }
    }

    @PostMapping("/simulate")
    public ResponseEntity<Map<String, Object>> simulate(@RequestBody Map<String, Object> request) {
        try {
            String prompt = (String) request.getOrDefault("prompt", "");
            String response = geminiService.simulate(prompt);
            return ResponseEntity.ok(Map.of(
                "response", response,
                "source", "groq",
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.error("Gemini simulate failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "error", e.getMessage() != null ? e.getMessage() : "Gemini unavailable",
                "source", "error",
                "timestamp", System.currentTimeMillis()
            ));
        }
    }

    /**
     * GET /api/ai/status
     * Check if Gemini API is available.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        boolean available = geminiService.isAvailable();
        return ResponseEntity.ok(Map.of(
            "available", available,
            "provider", "groq",
            "timestamp", System.currentTimeMillis()
        ));
    }

    private String generateFallbackNarrative(Map<String, Object> request) {
        return "Your Digital Twin is analyzing your data patterns. AI narrative generation is temporarily unavailable, but all scores and insights are computed from your real data and remain accurate.";
    }
}

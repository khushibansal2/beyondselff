package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.service.GeminiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import com.digitaltwin.backend.util.AuthUtil;

/**
 * AI Proxy Controller — Routes AI requests to Gemini via backend
 * to keep API key secure and enable PII anonymization.
 */
@RestController
@RequestMapping("/api/ai")
public class AIProxyController {

    private static final Logger log = LoggerFactory.getLogger(AIProxyController.class);

    private final GeminiService geminiService;

    public AIProxyController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    // Rate limiting map: userId -> Next Allowed Time
    private final Map<String, Long> rateLimits = new ConcurrentHashMap<>();

    private void enforceRateLimit(String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        long now = System.currentTimeMillis();
        long nextAllowed = rateLimits.getOrDefault(userId, 0L);
        if (now < nextAllowed) {
            throw new RuntimeException("Rate limit exceeded. Please wait.");
        }
        // Max 1 request every 2 seconds per user
        rateLimits.put(userId, now + 2000);
    }

    /**
     * POST /api/ai/chat
     * Sends a user message + computed context to Gemini and returns the AI response.
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chat(@RequestBody Map<String, Object> request,
                                                    @RequestHeader("Authorization") String authHeader) {
        try {
            enforceRateLimit(authHeader);
            String message = (String) request.getOrDefault("message", "");
            if (message.length() > 1000) {
                return ResponseEntity.badRequest().body(Map.of("error", "Message too long"));
            }

            Map<String, Object> context = (Map<String, Object>) request.getOrDefault("context", Map.of());
            String systemPrompt = (String) request.getOrDefault("systemPrompt", "");

            String response = geminiService.chat(message, context, systemPrompt);
            return ResponseEntity.ok(Map.of(
                "response", response,
                "source", "gemini",
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
    public ResponseEntity<Map<String, Object>> narrative(@RequestBody Map<String, Object> request,
                                                         @RequestHeader("Authorization") String authHeader) {
        try {
            enforceRateLimit(authHeader);
            Map<String, Object> computedData = (Map<String, Object>) request.getOrDefault("computedData", Map.of());
            String narrativeType = (String) request.getOrDefault("type", "dashboard");

            String narrative = geminiService.generateNarrative(computedData, narrativeType);
            return ResponseEntity.ok(Map.of(
                "narrative", narrative,
                "source", "gemini",
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
    public ResponseEntity<Map<String, Object>> explain(@RequestBody Map<String, Object> request,
                                                       @RequestHeader("Authorization") String authHeader) {
        try {
            enforceRateLimit(authHeader);
            Map<String, Object> insightData = (Map<String, Object>) request.getOrDefault("insightData", Map.of());
            String explanation = geminiService.explainInsight(insightData);
            return ResponseEntity.ok(Map.of(
                "explanation", explanation,
                "source", "gemini",
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
     * GET /api/ai/status
     * Check if Gemini API is available.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status() {
        boolean available = geminiService.isAvailable();
        return ResponseEntity.ok(Map.of(
            "available", available,
            "provider", "gemini",
            "timestamp", System.currentTimeMillis()
        ));
    }

    private String generateFallbackNarrative(Map<String, Object> request) {
        return "Your Digital Twin is analyzing your data patterns. AI narrative generation is temporarily unavailable, but all scores and insights are computed from your real data and remain accurate.";
    }
}

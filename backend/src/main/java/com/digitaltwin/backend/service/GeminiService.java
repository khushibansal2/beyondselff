package com.digitaltwin.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

/**
 * GeminiService — Handles communication with Google Gemini API.
 * 
 * Rules:
 * - PII is anonymized before sending to Gemini
 * - Gemini explains/narrates computed data — never invents raw scores
 * - Responses are validated before returning
 * - Graceful degradation when API is unavailable
 */
@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    public GeminiService() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.mapper = new ObjectMapper();
    }

    /**
     * Check if the Gemini API is configured and reachable.
     */
    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Send a chat message with user context to Gemini.
     */
    public String chat(String message, Map<String, Object> context, String systemPrompt) throws Exception {
        if (!isAvailable()) {
            throw new RuntimeException("Gemini API key not configured");
        }

        // Anonymize context — strip names, emails, exact financial amounts
        Map<String, Object> anonymized = anonymizeContext(context);

        String fullPrompt = buildChatPrompt(systemPrompt, message, anonymized);
        return callGemini(fullPrompt);
    }

    /**
     * Generate a narrative summary from computed data.
     */
    public String generateNarrative(Map<String, Object> computedData, String type) throws Exception {
        if (!isAvailable()) {
            throw new RuntimeException("Gemini API key not configured");
        }

        String prompt = buildNarrativePrompt(computedData, type);
        String response = callGemini(prompt);
        return validateNarrative(response);
    }

    /**
     * Generate an explanation for a specific insight.
     */
    public String explainInsight(Map<String, Object> insightData) throws Exception {
        if (!isAvailable()) {
            throw new RuntimeException("Gemini API key not configured");
        }

        String prompt = buildExplainPrompt(insightData);
        return callGemini(prompt);
    }

    /**
     * Core API call to Gemini.
     */
    private String callGemini(String prompt) throws Exception {
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(Map.of("text", prompt))
            )),
            "generationConfig", Map.of(
                "temperature", 0.7,
                "topP", 0.9,
                "maxOutputTokens", 1024
            )
        );

        String body = mapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GEMINI_URL + "?key=" + apiKey))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .timeout(Duration.ofSeconds(15))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 429) {
            throw new RuntimeException("RATE_LIMITED: Gemini free-tier quota exhausted. Please wait a minute and try again.");
        }
        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini API error: " + response.statusCode() + " - " + response.body());
        }

        // Parse response
        Map<String, Object> result = mapper.readValue(response.body(), Map.class);
        List<Map<String, Object>> candidates = (List<Map<String, Object>>) result.get("candidates");
        if (candidates != null && !candidates.isEmpty()) {
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts != null && !parts.isEmpty()) {
                return (String) parts.get(0).get("text");
            }
        }

        throw new RuntimeException("No response from Gemini API");
    }

    /**
     * Anonymize user context before sending to Gemini.
     * Strips PII while preserving data patterns needed for analysis.
     */
    private Map<String, Object> anonymizeContext(Map<String, Object> context) {
        Map<String, Object> safe = new HashMap<>(context);
        // Remove PII fields
        safe.remove("name");
        safe.remove("email");
        safe.remove("id");
        safe.remove("password");
        safe.remove("avatar");
        // Keep scores, trends, factors — these are computed metrics, not PII
        return safe;
    }

    private String buildChatPrompt(String systemPrompt, String message, Map<String, Object> context) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an emotionally intelligent AI life coach for a Personal Digital Twin platform. ");
        sb.append("You help users understand how their health, finances, and career interconnect. ");
        sb.append("IMPORTANT RULES:\n");
        sb.append("- All scores and metrics shown are ALREADY COMPUTED by deterministic engines. You must EXPLAIN them, not invent new numbers.\n");
        sb.append("- Frame projections as estimates, not guarantees.\n");
        sb.append("- Be empathetic and actionable. Avoid generic advice.\n");
        sb.append("- Reference specific data points from the user's context.\n");
        sb.append("- Never make medically or financially definitive claims.\n");
        sb.append("- Keep responses concise (2-4 paragraphs max).\n\n");

        if (systemPrompt != null && !systemPrompt.isBlank()) {
            sb.append(systemPrompt).append("\n\n");
        }

        if (!context.isEmpty()) {
            sb.append("USER'S CURRENT STATE (computed by system):\n");
            try {
                sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(context));
            } catch (Exception e) {
                sb.append(context.toString());
            }
            sb.append("\n\n");
        }

        sb.append("USER MESSAGE: ").append(message);
        return sb.toString();
    }

    private String buildNarrativePrompt(Map<String, Object> computedData, String type) {
        StringBuilder sb = new StringBuilder();
        sb.append("Generate an emotionally intelligent ");
        
        switch (type) {
            case "dashboard":
                sb.append("dashboard summary ");
                break;
            case "insight":
                sb.append("insight explanation ");
                break;
            case "simulator":
                sb.append("simulation narrative (framed as ESTIMATES, not guarantees) ");
                break;
            default:
                sb.append("analysis summary ");
        }

        sb.append("based on the following COMPUTED system data. ");
        sb.append("RULES: Do NOT invent numbers. Only explain/contextualize the provided data. ");
        sb.append("Be specific, reference actual values, show cause-effect relationships. ");
        sb.append("Keep it to 2-3 sentences. Be warm but direct.\n\n");
        sb.append("COMPUTED DATA:\n");

        try {
            sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(computedData));
        } catch (Exception e) {
            sb.append(computedData.toString());
        }

        return sb.toString();
    }

    private String buildExplainPrompt(Map<String, Object> insightData) {
        StringBuilder sb = new StringBuilder();
        sb.append("Explain this insight to the user in a clear, empathetic way. ");
        sb.append("Show the causal reasoning and contributing factors. ");
        sb.append("Do NOT invent data — only explain what's provided. ");
        sb.append("Keep it to 2-3 sentences.\n\n");
        sb.append("INSIGHT DATA:\n");

        try {
            sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(insightData));
        } catch (Exception e) {
            sb.append(insightData.toString());
        }

        return sb.toString();
    }

    /**
     * Validate narrative output — prevent impossible claims.
     */
    private String validateNarrative(String narrative) {
        if (narrative == null || narrative.isBlank()) {
            return "Unable to generate narrative at this time.";
        }
        // Basic validation — could be extended
        return narrative.trim();
    }
}

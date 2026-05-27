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

@Service
public class GeminiService {

    @Value("${groq.api.key:}")
    private String apiKey;

    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    public GeminiService() {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.mapper = new ObjectMapper();
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String chat(String message, Map<String, Object> context, String systemPrompt, List<Map<String, Object>> history) throws Exception {
        if (!isAvailable()) throw new RuntimeException("Groq API key not configured");
        Map<String, Object> anonymized = anonymizeContext(context);
        return callGroqMultiTurn(systemPrompt, anonymized, history, message);
    }

    public String generateNarrative(Map<String, Object> computedData, String type) throws Exception {
        if (!isAvailable()) throw new RuntimeException("Groq API key not configured");
        return validateNarrative(callGroq(buildNarrativePrompt(computedData, type)));
    }

    public String explainInsight(Map<String, Object> insightData) throws Exception {
        if (!isAvailable()) throw new RuntimeException("Groq API key not configured");
        return callGroq(buildExplainPrompt(insightData));
    }

    public String generateRecommendations(Map<String, Object> userContext) throws Exception {
        if (!isAvailable()) throw new RuntimeException("Groq API key not configured");
        return callGroq(buildRecommendationsPrompt(userContext));
    }

    private String callGroqMultiTurn(String systemPrompt, Map<String, Object> context, List<Map<String, Object>> history, String userMessage) throws Exception {
        List<Map<String, Object>> messages = new ArrayList<>();

        // System message with full grounding context
        String systemContent = systemPrompt != null && !systemPrompt.isBlank()
            ? systemPrompt
            : "You are an emotionally intelligent AI life coach. Be concise (3-5 sentences). Reference the user's actual scores. Do not invent numbers.";

        if (!context.isEmpty()) {
            try {
                systemContent += "\n\nUSER'S CURRENT STATE:\n" + mapper.writerWithDefaultPrettyPrinter().writeValueAsString(context);
            } catch (Exception ignored) {}
        }
        messages.add(Map.of("role", "system", "content", systemContent));

        // Prior conversation turns (last 10 to stay within token limits)
        int start = Math.max(0, history.size() - 10);
        for (int i = start; i < history.size(); i++) {
            Map<String, Object> turn = history.get(i);
            String role = String.valueOf(turn.getOrDefault("role", "user"));
            String content = String.valueOf(turn.getOrDefault("content", ""));
            if (!content.isBlank()) {
                messages.add(Map.of("role", role, "content", content));
            }
        }

        // Current user message
        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", GROQ_MODEL);
        requestBody.put("messages", messages);
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 1024);

        return sendGroqRequest(requestBody);
    }

    private String callGroq(String prompt) throws Exception {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", GROQ_MODEL);
        requestBody.put("messages", List.of(Map.of("role", "user", "content", prompt)));
        requestBody.put("temperature", 0.7);
        requestBody.put("max_tokens", 1024);
        return sendGroqRequest(requestBody);
    }

    private String sendGroqRequest(Map<String, Object> requestBody) throws Exception {
        String body = mapper.writeValueAsString(requestBody);

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(GROQ_URL))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + apiKey)
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .timeout(Duration.ofSeconds(20))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 429) {
            throw new RuntimeException("RATE_LIMITED: Groq quota exceeded. Please wait and try again.");
        }
        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error: " + response.statusCode() + " - " + response.body());
        }

        Map<String, Object> result = mapper.readValue(response.body(), Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) result.get("choices");
        if (choices != null && !choices.isEmpty()) {
            Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
            if (msg != null) return (String) msg.get("content");
        }

        throw new RuntimeException("No response from Groq API");
    }

    private Map<String, Object> anonymizeContext(Map<String, Object> context) {
        Map<String, Object> safe = new HashMap<>(context);
        safe.remove("name");
        safe.remove("email");
        safe.remove("id");
        safe.remove("password");
        safe.remove("avatar");
        return safe;
    }

    private String buildChatPrompt(String systemPrompt, String message, Map<String, Object> context) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an emotionally intelligent AI life coach for a Personal Digital Twin platform. ");
        sb.append("You help users understand how their health, finances, and career interconnect.\n");
        sb.append("RULES: All scores are ALREADY COMPUTED — explain them, don't invent numbers. ");
        sb.append("Be empathetic, specific, and concise (2-4 paragraphs max).\n\n");
        if (systemPrompt != null && !systemPrompt.isBlank()) sb.append(systemPrompt).append("\n\n");
        if (!context.isEmpty()) {
            sb.append("USER'S CURRENT STATE:\n");
            try { sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(context)); }
            catch (Exception e) { sb.append(context.toString()); }
            sb.append("\n\n");
        }
        sb.append("USER MESSAGE: ").append(message);
        return sb.toString();
    }

    private String buildNarrativePrompt(Map<String, Object> computedData, String type) {
        StringBuilder sb = new StringBuilder();
        sb.append("Generate a concise, emotionally intelligent ").append(type).append(" summary. ");
        sb.append("Do NOT invent numbers — only explain the provided computed data. 2-3 sentences.\n\n");
        sb.append("COMPUTED DATA:\n");
        try { sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(computedData)); }
        catch (Exception e) { sb.append(computedData.toString()); }
        return sb.toString();
    }

    private String buildRecommendationsPrompt(Map<String, Object> userContext) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an emotionally intelligent AI life coach for a Digital Twin app.\n");
        sb.append("Based on the user's REAL computed scores below, generate exactly 3 specific, actionable recommendations.\n");
        sb.append("Return ONLY a valid JSON array (no markdown, no extra text) with 3 objects, each with these fields:\n");
        sb.append("{\"domain\": \"health|finance|career|cross\", \"priority\": \"high|medium|low\", ");
        sb.append("\"title\": \"short title (max 8 words)\", \"action\": \"one specific step to take today\", ");
        sb.append("\"reason\": \"why this matters, referencing their actual score\", \"impact\": \"expected outcome in 2-4 weeks\"}\n\n");
        sb.append("Rules:\n");
        sb.append("- Reference actual score values from the data. Do NOT invent numbers.\n");
        sb.append("- Prioritize the domain with the lowest score.\n");
        sb.append("- Include at least one cross-domain recommendation if cascade effects are present.\n");
        sb.append("- Keep each field concise (under 20 words).\n\n");
        sb.append("USER STATE:\n");
        try { sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(anonymizeContext(userContext))); }
        catch (Exception e) { sb.append(userContext.toString()); }
        return sb.toString();
    }

    private String buildExplainPrompt(Map<String, Object> insightData) {
        StringBuilder sb = new StringBuilder();
        sb.append("Explain this insight clearly and empathetically. Show causal reasoning. ");
        sb.append("Do NOT invent data. 2-3 sentences.\n\nINSIGHT DATA:\n");
        try { sb.append(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(insightData)); }
        catch (Exception e) { sb.append(insightData.toString()); }
        return sb.toString();
    }

    private String validateNarrative(String narrative) {
        if (narrative == null || narrative.isBlank()) return "Unable to generate narrative at this time.";
        return narrative.trim();
    }
}

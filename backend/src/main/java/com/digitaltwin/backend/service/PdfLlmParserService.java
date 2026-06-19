package com.digitaltwin.backend.service;

import com.digitaltwin.backend.dto.ParsedBankStatement;
import com.digitaltwin.backend.dto.ParsedMedicalReport;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PdfLlmParserService {

    private static final Logger log = LoggerFactory.getLogger(PdfLlmParserService.class);

    private static final int CHUNK_SIZE = 4000;
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    @Value("${groq.api.key:}")
    private String apiKey;

    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    public PdfLlmParserService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.mapper = new ObjectMapper();
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    // ── Bank Statement ─────────────────────────────────────────────────────────

    public ParsedBankStatement parseBankStatement(String rawText) throws Exception {
        if (rawText == null || rawText.isBlank()) {
            return emptyBankStatement();
        }
        if (!isAvailable()) {
            log.warn("Groq API key not set — bank statement PDF will not be structured");
            return emptyBankStatement();
        }
        try {
            String text = rawText.length() > CHUNK_SIZE ? rawText.substring(0, CHUNK_SIZE) : rawText;
            String json = callGroq(text, bankStatementPrompt(text));
            String cleaned = extractJson(json);
            ParsedBankStatement result = mapper.readValue(cleaned, ParsedBankStatement.class);
            if (result.getTransactions() == null) result.setTransactions(new ArrayList<>());
            log.info("Bank statement parsed: {} transactions", result.getTransactions().size());
            return result;
        } catch (Exception e) {
            log.warn("Bank statement LLM parsing failed: {}", e.getMessage());
            return emptyBankStatement();
        }
    }

    // ── Medical Report ─────────────────────────────────────────────────────────

    public ParsedMedicalReport parseMedicalReport(String rawText) throws Exception {
        if (rawText == null || rawText.isBlank()) {
            return emptyMedicalReport();
        }
        if (!isAvailable()) {
            log.warn("Groq API key not set — medical report PDF will not be structured");
            return emptyMedicalReport();
        }
        try {
            String text = rawText.length() > CHUNK_SIZE ? rawText.substring(0, CHUNK_SIZE) : rawText;
            String json = callGroq(text, medicalReportPrompt(text));
            String cleaned = extractJson(json);
            ParsedMedicalReport result = mapper.readValue(cleaned, ParsedMedicalReport.class);
            if (result.getMetrics() == null) result.setMetrics(new ArrayList<>());
            if (result.getDiagnoses() == null) result.setDiagnoses(new ArrayList<>());
            log.info("Medical report parsed: {} metrics, {} diagnoses",
                    result.getMetrics().size(), result.getDiagnoses().size());
            return result;
        } catch (Exception e) {
            log.warn("Medical report LLM parsing failed: {}", e.getMessage());
            return emptyMedicalReport();
        }
    }

    // ── Groq call ──────────────────────────────────────────────────────────────

    private String callGroq(String text, String prompt) throws Exception {
        Map<String, Object> requestBody = Map.of(
                "model", GROQ_MODEL,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a financial and medical document parser. Always respond with valid JSON only. No markdown, no explanation."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.1,
                "max_tokens", 2048
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(requestBody)))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 429) {
            throw new RuntimeException("RATE_LIMITED: Groq quota exceeded");
        }
        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API error " + response.statusCode() + ": " + response.body());
        }

        Map<String, Object> result = mapper.readValue(response.body(), Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) result.get("choices");
        if (choices == null || choices.isEmpty()) throw new RuntimeException("Empty response from Groq");
        Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
        return msg != null ? (String) msg.get("content") : null;
    }

    // ── Prompts ────────────────────────────────────────────────────────────────

    private String bankStatementPrompt(String text) {
        return """
                Parse the following bank statement and return ONLY a JSON object with this exact schema:
                {
                  "accountHolder": "Full name or null",
                  "period": "e.g. January 2024 or null",
                  "transactions": [
                    {
                      "date": "YYYY-MM-DD",
                      "description": "transaction description",
                      "amount": 45.99,
                      "category": "Food/Shopping/Utilities/Healthcare/Transport/Entertainment/Income/Transfer/Other",
                      "type": "debit or credit",
                      "merchant": "merchant name or null"
                    }
                  ]
                }

                Rules:
                - Return ONLY the JSON object, no markdown, no explanation.
                - amount must be a positive number regardless of debit/credit.
                - type must be exactly "debit" or "credit".
                - Use null for missing fields, empty array [] if no transactions found.
                - date must be in YYYY-MM-DD format; use null if unparseable.

                BANK STATEMENT TEXT:
                """ + text;
    }

    private String medicalReportPrompt(String text) {
        return """
                Parse the following medical report and return ONLY a JSON object with this exact schema:
                {
                  "patientName": "Full name or null",
                  "reportDate": "YYYY-MM-DD or null",
                  "summary": "1-2 sentence clinical summary or null",
                  "metrics": [
                    {
                      "name": "metric name e.g. Heart Rate, Blood Pressure, BMI, HbA1c",
                      "value": "numeric value as string",
                      "unit": "bpm / mmHg / kg/m2 / % / etc",
                      "status": "normal or high or low or null"
                    }
                  ],
                  "diagnoses": ["diagnosis 1", "diagnosis 2"]
                }

                Rules:
                - Return ONLY the JSON object, no markdown, no explanation.
                - Extract all measurable health metrics (vitals, lab values, BMI, etc.).
                - Use null for missing fields, empty arrays [] if nothing found.
                - reportDate must be YYYY-MM-DD; use null if unparseable.

                MEDICAL REPORT TEXT:
                """ + text;
    }

    // ── JSON extraction ────────────────────────────────────────────────────────

    private String extractJson(String raw) {
        if (raw == null || raw.isBlank()) throw new RuntimeException("LLM returned empty response");
        Matcher fence = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```").matcher(raw.trim());
        if (fence.find()) return fence.group(1).trim();
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return raw.substring(start, end + 1);
        return raw.trim();
    }

    // ── Empty fallbacks ────────────────────────────────────────────────────────

    private ParsedBankStatement emptyBankStatement() {
        ParsedBankStatement s = new ParsedBankStatement();
        s.setTransactions(new ArrayList<>());
        return s;
    }

    private ParsedMedicalReport emptyMedicalReport() {
        ParsedMedicalReport r = new ParsedMedicalReport();
        r.setMetrics(new ArrayList<>());
        r.setDiagnoses(new ArrayList<>());
        return r;
    }
}

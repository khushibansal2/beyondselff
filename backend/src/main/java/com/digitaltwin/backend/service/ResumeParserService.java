package com.digitaltwin.backend.service;

import com.digitaltwin.backend.dto.ParsedResume;
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
public class ResumeParserService {

    private static final Logger log = LoggerFactory.getLogger(ResumeParserService.class);

    private static final int CHUNK_SIZE = 3000;
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    @Value("${groq.api.key:}")
    private String apiKey;

    private final HttpClient httpClient;
    private final ObjectMapper mapper;

    public ResumeParserService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.mapper = new ObjectMapper();
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Full pipeline: extract → chunk → LLM parse → validate → return.
     */
    public ParsedResume parse(String rawText) throws Exception {
        if (rawText == null || rawText.isBlank()) {
            throw new IllegalArgumentException("Resume text is empty");
        }

        String textToSend = rawText.length() > CHUNK_SIZE
                ? chunkText(rawText)
                : rawText;

        if (!isAvailable()) {
            log.warn("Groq API key not set — falling back to regex-only resume extraction");
            return regexFallback(rawText);
        }

        String llmJson = callGroq(textToSend);
        String cleaned = extractJson(llmJson);
        ParsedResume resume = parseAndValidate(cleaned, rawText);
        log.info("Resume parsed: {} skills, {} experiences, {} projects",
                resume.getSkills().size(), resume.getExperience().size(), resume.getProjects().size());
        return resume;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private String chunkText(String text) {
        // Take first chunk (contains name/contact/summary) + last chunk (skills/certs)
        String first = text.substring(0, Math.min(CHUNK_SIZE, text.length()));
        if (text.length() <= CHUNK_SIZE) return first;
        String last = text.substring(Math.max(0, text.length() - 1000));
        return first + "\n...\n" + last;
    }

    private String callGroq(String resumeText) throws Exception {
        String prompt = buildPrompt(resumeText);

        Map<String, Object> requestBody = Map.of(
                "model", GROQ_MODEL,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a resume parser. Always respond with valid JSON only. No markdown, no explanation."),
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
            throw new RuntimeException("RATE_LIMITED: Groq quota exceeded. Resume parsing unavailable.");
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

    private String buildPrompt(String resumeText) {
        return """
                Parse the following resume and return ONLY a JSON object with this exact schema:
                {
                  "name": "Full Name or null",
                  "email": "email@example.com or null",
                  "phone": "phone number or null",
                  "location": "City, Country or null",
                  "summary": "professional summary in 1-2 sentences or null",
                  "skills": ["Skill1", "Skill2"],
                  "experience": [
                    {
                      "company": "Company Name",
                      "title": "Job Title",
                      "duration": "Jan 2022 – Present",
                      "description": "key responsibilities in 1 sentence"
                    }
                  ],
                  "education": [
                    {
                      "institution": "University Name",
                      "degree": "B.Tech Computer Science",
                      "year": "2020"
                    }
                  ],
                  "projects": ["Project title: one-line description"],
                  "certifications": ["Certification name"]
                }

                Rules:
                - Return ONLY the JSON object, no markdown, no explanation.
                - Use null for missing fields, empty arrays [] for missing lists.
                - Keep descriptions concise (under 20 words each).

                RESUME TEXT:
                """ + resumeText;
    }

    /** Strip markdown code fences if LLM wrapped the JSON in ```json ... ``` */
    private String extractJson(String raw) {
        if (raw == null || raw.isBlank()) throw new RuntimeException("LLM returned empty response");
        Matcher fence = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```").matcher(raw.trim());
        if (fence.find()) return fence.group(1).trim();
        // Try to find first { ... }
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) return raw.substring(start, end + 1);
        return raw.trim();
    }

    /** Parse LLM JSON and enforce schema: required arrays must not be null. */
    @SuppressWarnings("unchecked")
    private ParsedResume parseAndValidate(String json, String rawText) {
        ParsedResume resume;
        try {
            resume = mapper.readValue(json, ParsedResume.class);
        } catch (Exception e) {
            log.warn("LLM JSON parse failed ({}), falling back to regex", e.getMessage());
            return regexFallback(rawText);
        }

        // Schema validation: lists must not be null
        if (resume.getSkills() == null) resume.setSkills(new ArrayList<>());
        if (resume.getExperience() == null) resume.setExperience(new ArrayList<>());
        if (resume.getEducation() == null) resume.setEducation(new ArrayList<>());
        if (resume.getProjects() == null) resume.setProjects(new ArrayList<>());
        if (resume.getCertifications() == null) resume.setCertifications(new ArrayList<>());

        // If LLM produced no skills at all, augment with regex
        if (resume.getSkills().isEmpty()) {
            resume.setSkills(regexSkills(rawText));
        }

        return resume;
    }

    /** Last-resort regex extraction when Groq is unavailable or fails. */
    private ParsedResume regexFallback(String text) {
        ParsedResume r = new ParsedResume();
        r.setSkills(regexSkills(text));
        r.setExperience(new ArrayList<>());
        r.setEducation(new ArrayList<>());
        r.setProjects(new ArrayList<>());
        r.setCertifications(new ArrayList<>());

        Matcher email = Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}").matcher(text);
        if (email.find()) r.setEmail(email.group());

        Matcher phone = Pattern.compile("(\\+?[0-9][\\s\\-.]?){9,14}").matcher(text);
        if (phone.find()) r.setPhone(phone.group().trim());

        return r;
    }

    private List<String> regexSkills(String text) {
        String[] knownSkills = {
            "Java", "Python", "JavaScript", "TypeScript", "React", "Angular", "Vue",
            "Spring Boot", "Django", "FastAPI", "Node.js", "Express",
            "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis",
            "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
            "C++", "C#", "Go", "Rust", "Kotlin", "Swift",
            "GraphQL", "REST", "gRPC", "Kafka", "RabbitMQ",
            "Git", "Linux", "CI/CD", "Jenkins", "GitHub Actions"
        };
        List<String> found = new ArrayList<>();
        for (String skill : knownSkills) {
            if (Pattern.compile("\\b" + Pattern.quote(skill) + "\\b", Pattern.CASE_INSENSITIVE)
                    .matcher(text).find()) {
                found.add(skill);
            }
        }
        return found;
    }
}

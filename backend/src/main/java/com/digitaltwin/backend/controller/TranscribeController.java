package com.digitaltwin.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Proxies audio to Groq Whisper for transcription.
 * Endpoint: POST /api/transcribe/audio
 * Accepts: multipart/form-data  { audio: <blob>, mockText?: <string> }
 * Returns: { transcript, confidence, provider, timestamp }
 */
@RestController
@RequestMapping("/api/transcribe")
public class TranscribeController {

    private static final Logger log = LoggerFactory.getLogger(TranscribeController.class);
    private static final String GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

    @Value("${groq.api.key:}")
    private String groqApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/audio")
    public ResponseEntity<Map<String, Object>> transcribeAudio(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam(value = "mockText", required = false) String mockText) {

        // If mockText is provided (dev/test), echo it back immediately
        if (mockText != null && !mockText.isBlank()) {
            return ResponseEntity.ok(Map.of(
                "transcript", mockText,
                "confidence", 0.99,
                "provider", "mock",
                "timestamp", System.currentTimeMillis()
            ));
        }

        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("GROQ_API_KEY not configured — transcription unavailable");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "error", "Transcription service not configured",
                "provider", "none",
                "timestamp", System.currentTimeMillis()
            ));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.setBearerAuth(groqApiKey);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            // Wrap as a named resource so RestTemplate sets the filename correctly
            body.add("file", new org.springframework.core.io.ByteArrayResource(audio.getBytes()) {
                @Override public String getFilename() { return "recording.webm"; }
            });
            body.add("model", "whisper-large-v3");
            body.add("response_format", "json");
            body.add("language", "en");

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map> groqResponse = restTemplate.postForEntity(GROQ_TRANSCRIBE_URL, request, Map.class);

            if (groqResponse.getStatusCode().is2xxSuccessful() && groqResponse.getBody() != null) {
                String transcript = (String) groqResponse.getBody().getOrDefault("text", "");
                return ResponseEntity.ok(Map.of(
                    "transcript", transcript,
                    "confidence", 0.92,
                    "provider", "groq-whisper",
                    "timestamp", System.currentTimeMillis()
                ));
            }

            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
                "error", "Groq returned non-2xx: " + groqResponse.getStatusCode(),
                "provider", "groq-whisper",
                "timestamp", System.currentTimeMillis()
            ));

        } catch (Exception e) {
            log.error("Audio transcription failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "error", "Transcription failed: " + e.getMessage(),
                "provider", "groq-whisper",
                "timestamp", System.currentTimeMillis()
            ));
        }
    }
}

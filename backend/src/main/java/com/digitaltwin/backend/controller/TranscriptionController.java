package com.digitaltwin.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.digitaltwin.backend.util.AuthUtil;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * TranscriptionController — Backend audio-to-text pipeline.
 *
 * Real mode: Set SPEECH_API_KEY env var to a valid Google Cloud Speech-to-Text key.
 * Fallback mode: If no key is configured (local dev), accepts mockText from client
 *   (the VoiceController sends text-fallback when browser is in text mode).
 *
 * This controller NEVER fabricates transcript content — it either transcribes
 * real audio via a real API, or passes through the client-provided text verbatim.
 */
@RestController
@RequestMapping("/api/transcribe")
public class TranscriptionController {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionController.class);

    // Rate limiting: userId → Next Allowed Time
    private final Map<String, Long> rateLimits = new ConcurrentHashMap<>();

    @Value("${speech.api.key:}")
    private String speechApiKey;

    private void enforceRateLimit(String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        long now = System.currentTimeMillis();
        long nextAllowed = rateLimits.getOrDefault(userId, 0L);
        if (now < nextAllowed) {
            throw new RuntimeException("Rate limit exceeded. Please wait 3 seconds between requests.");
        }
        rateLimits.put(userId, now + 3000);
    }

    /**
     * POST /api/transcribe/audio
     *
     * Accepts audio blob + optional mockText (for text-input fallback mode).
     *
     * If SPEECH_API_KEY is set → sends audio to Google Speech-to-Text.
     * If SPEECH_API_KEY is not set → requires mockText to be provided.
     *   (VoiceController always sends mockText when the user typed instead of speaking)
     */
    @PostMapping("/audio")
    public ResponseEntity<Map<String, Object>> transcribeAudio(
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam(value = "mockText", required = false) String mockText,
            @RequestHeader("Authorization") String authHeader) {

        try {
            enforceRateLimit(authHeader);

            if (audioFile.isEmpty() && (mockText == null || mockText.isBlank())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No audio or text input provided."));
            }

            // Security: limit file size (5MB)
            if (audioFile.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                        .body(Map.of("error", "Audio file too large. Max 5MB."));
            }

            // Security: validate mime type
            String contentType = audioFile.getContentType();
            boolean isValidAudio = contentType != null &&
                    (contentType.startsWith("audio/") || contentType.startsWith("video/"));

            if (!audioFile.isEmpty() && !isValidAudio) {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                        .body(Map.of("error", "Invalid file type. Only audio formats accepted."));
            }

            // Path 1: Text fallback — client sent typed text (no fabrication)
            if (mockText != null && !mockText.isBlank()) {
                log.info("[Transcription] Text-fallback mode: passing through client text ({} chars)", mockText.length());
                return ResponseEntity.ok(Map.of(
                        "transcript",  mockText.trim(),
                        "confidence",  1.0,
                        "provider",    "text_input",
                        "timestamp",   System.currentTimeMillis()
                ));
            }

            // Path 2: Real audio — requires SPEECH_API_KEY
            if (speechApiKey != null && !speechApiKey.isBlank()) {
                String transcript = callGoogleSpeechToText(audioFile);
                log.info("[Transcription] Real STT transcribed: '{}'", transcript);
                return ResponseEntity.ok(Map.of(
                        "transcript",  transcript,
                        "confidence",  0.95,
                        "provider",    "google_speech_to_text",
                        "timestamp",   System.currentTimeMillis()
                ));
            }

            // Path 3: No API key and no text — tell client to use text fallback
            log.warn("[Transcription] No SPEECH_API_KEY configured. Returning fallback instruction.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error",       "Speech-to-text not configured. Use text input mode.",
                    "fallback",    true,
                    "provider",    "none"
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("[Transcription] Failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Transcription service error."));
        }
    }

    /**
     * Call Google Cloud Speech-to-Text REST API.
     * Requires SPEECH_API_KEY environment variable.
     */
    private String callGoogleSpeechToText(MultipartFile audioFile) throws Exception {
        // Google Cloud Speech-to-Text v1 REST API
        String endpoint = "https://speech.googleapis.com/v1/speech:recognize?key=" + speechApiKey;

        byte[] audioBytes = audioFile.getBytes();
        String base64Audio = java.util.Base64.getEncoder().encodeToString(audioBytes);

        String requestBody = String.format("""
            {
              "config": {
                "encoding": "WEBM_OPUS",
                "sampleRateHertz": 48000,
                "languageCode": "en-IN",
                "alternativeLanguageCodes": ["en-US"],
                "model": "latest_short"
              },
              "audio": {
                "content": "%s"
              }
            }
            """, base64Audio);

        var http = java.net.http.HttpClient.newHttpClient();
        var request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(endpoint))
                .header("Content-Type", "application/json")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        var response = http.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Google STT API error: " + response.statusCode());
        }

        // Parse the transcript from response JSON
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var root   = mapper.readTree(response.body());
        var results = root.path("results");
        if (results.isEmpty() || results.get(0).path("alternatives").isEmpty()) {
            return "";
        }
        return results.get(0).path("alternatives").get(0).path("transcript").asText("");
    }
}

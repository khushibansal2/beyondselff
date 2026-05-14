package com.digitaltwin.backend.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.digitaltwin.backend.util.AuthUtil;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/transcribe")
public class TranscriptionController {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionController.class);

    // Rate limiting map: userId -> Next Allowed Time
    private final Map<String, Long> rateLimits = new ConcurrentHashMap<>();

    private void enforceRateLimit(String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        long now = System.currentTimeMillis();
        long nextAllowed = rateLimits.getOrDefault(userId, 0L);
        if (now < nextAllowed) {
            throw new RuntimeException("Rate limit exceeded. Please wait.");
        }
        // Max 1 request every 3 seconds per user to prevent rapid voice spam
        rateLimits.put(userId, now + 3000);
    }

    /**
     * POST /api/transcribe/audio
     * Receives an audio blob, validates it securely, and simulates sending to Whisper.
     */
    @PostMapping("/audio")
    public ResponseEntity<Map<String, Object>> transcribeAudio(@RequestParam("audio") MultipartFile audioFile,
                                                               @RequestParam(value = "mockText", required = false) String mockText,
                                                               @RequestHeader("Authorization") String authHeader) {
        try {
            enforceRateLimit(authHeader);

            if (audioFile.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Empty audio file provided"));
            }

            // Security: limit file size (e.g., 5MB max)
            if (audioFile.getSize() > 5 * 1024 * 1024) {
                return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                        .body(Map.of("error", "Audio file too large. Max 5MB allowed."));
            }

            // Security: validate mime type (allowing common web audio mimes)
            String contentType = audioFile.getContentType();
            if (contentType == null || (!contentType.startsWith("audio/") && !contentType.startsWith("video/"))) {
                return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                        .body(Map.of("error", "Invalid file type. Only audio formats allowed."));
            }

            // In a real production app, we would:
            // 1. Save to a secure temp file
            // 2. Call OpenAI Whisper API or Local Whisper model
            // 3. Delete temp file

            // Mock Whisper Processing Pipeline
            long size = audioFile.getSize();
            String transcript = (mockText != null && !mockText.isEmpty()) ? mockText : simulateTranscriptionForDemo(size);

            return ResponseEntity.ok(Map.of(
                    "transcript", transcript,
                    "confidence", 0.98,
                    "provider", "simulated_whisper",
                    "timestamp", System.currentTimeMillis()
            ));

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Transcription failed: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Transcription service failed"));
        }
    }

    private String simulateTranscriptionForDemo(long size) {
        // Return a mock string to allow the frontend parser to test correctly
        // Real logic would actually decode the PCM audio via Whisper.
        // If size is even, test logging. If odd, test AI coach routing.
        if (size % 2 == 0) {
            return "Log 7 hours sleep and stress 4";
        }
        return "Why is my burnout increasing?";
    }
}

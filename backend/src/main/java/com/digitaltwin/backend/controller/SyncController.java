package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.CareerRecord;
import com.digitaltwin.backend.entity.ImportHistory;
import com.digitaltwin.backend.repository.CareerRecordRepository;
import com.digitaltwin.backend.repository.ImportHistoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

import com.digitaltwin.backend.util.AuthUtil;

@RestController
@RequestMapping("/api/sync")
public class SyncController {

    private final CareerRecordRepository careerRepo;
    private final ImportHistoryRepository importRepo;
    private final AuthUtil authUtil;
    private final RestTemplate restTemplate = new RestTemplate();

    public SyncController(CareerRecordRepository careerRepo, ImportHistoryRepository importRepo, AuthUtil authUtil) {
        this.careerRepo = careerRepo;
        this.importRepo = importRepo;
        this.authUtil = authUtil;
    }

    @PostMapping("/github")
    public ResponseEntity<?> syncGithub(@RequestHeader("Authorization") String authHeader, @RequestParam String githubUsername) {
        try {
            String userId = authUtil.getUserIdFromToken(authHeader);
            // 1. Fetch from GitHub API
            String userUrl = "https://api.github.com/users/" + githubUsername;
            JsonNode userNode = restTemplate.getForObject(userUrl, JsonNode.class);
            
            if (userNode == null || userNode.has("message") && userNode.get("message").asText().equals("Not Found")) {
                return ResponseEntity.badRequest().body("GitHub user not found");
            }
            
            int publicRepos = userNode.get("public_repos").asInt();
            
            // Note: getting true commit counts requires graphql or scraping events.
            // For hackathon real-world simulation, we use public_repos and a proxy for commits.
            // Let's assume 10 commits per repo as a baseline estimate for this demo.
            int estimatedCommits = publicRepos * 10;

            // 2. Create ImportHistory
            ImportHistory history = ImportHistory.builder()
                    .userId(userId)
                    .originalFilename("github_sync_" + githubUsername)
                    .storagePath("api://github/" + githubUsername)
                    .mimeType("application/json")
                    .fileType("api_sync")
                    .source("github")
                    .detectedDomain("career")
                    .uploadedAt(LocalDateTime.now())
                    .status(ImportHistory.ImportStatus.SUCCESS)
                    .recordCount(1)
                    .validCount(1)
                    .parsedAt(LocalDateTime.now())
                    .build();
            history = importRepo.save(history);

            // 3. Create CareerRecord
            CareerRecord rec = CareerRecord.builder()
                    .userId(userId)
                    .importId(history.getId())
                    .source("github")
                    .activityDate(LocalDate.now())
                    .githubRepos(publicRepos)
                    .githubCommits(estimatedCommits)
                    .createdAt(LocalDateTime.now())
                    .build();
            careerRepo.save(rec);

            return ResponseEntity.ok(Map.of("message", "Synced GitHub", "repos", publicRepos, "commits", estimatedCommits));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to sync GitHub: " + e.getMessage());
        }
    }
}

package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.Goal;
import com.digitaltwin.backend.repository.GoalRepository;
import com.digitaltwin.backend.service.GamificationService;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalRepository goalRepo;
    private final GamificationService gamificationService;
    private final AuthUtil authUtil;

    public GoalController(GoalRepository goalRepo, GamificationService gamificationService, AuthUtil authUtil) {
        this.goalRepo = goalRepo;
        this.gamificationService = gamificationService;
        this.authUtil = authUtil;
    }

    @GetMapping
    public ResponseEntity<List<Goal>> getGoals(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(goalRepo.findByUserIdOrderByCreatedAtDesc(userId));
    }

    @GetMapping("/domain/{domain}")
    public ResponseEntity<List<Goal>> getGoalsByDomain(@RequestHeader("Authorization") String auth,
                                                        @PathVariable String domain) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(goalRepo.findByUserIdAndDomain(userId, domain));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Goal>> getGoalsByStatus(@RequestHeader("Authorization") String auth,
                                                        @PathVariable String status) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(goalRepo.findByUserIdAndStatus(userId, status));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createGoal(@RequestHeader("Authorization") String auth,
                                                           @RequestBody Goal goal) {
        String userId = authUtil.getUserIdFromToken(auth);
        goal.setId(null);
        goal.setUserId(userId);
        goal.setStatus(goal.getStatus() != null ? goal.getStatus() : "active");
        goal.setCurrentValue(goal.getCurrentValue() != null ? goal.getCurrentValue() : 0.0);
        goal.setCreatedAt(LocalDateTime.now());
        goal.setUpdatedAt(LocalDateTime.now());
        Goal saved = goalRepo.save(goal);

        // Award XP for creating first goal
        Map<String, Object> award = gamificationService.awardGoalCreated(userId, goalRepo.countByUserIdAndStatus(userId, "active"));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("goal", saved, "award", award));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Goal> updateGoal(@RequestHeader("Authorization") String auth,
                                           @PathVariable Long id,
                                           @RequestBody Goal updated) {
        String userId = authUtil.getUserIdFromToken(auth);
        Goal existing = goalRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        updated.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(goalRepo.save(updated));
    }

    // Dedicated endpoint to update only the progress value
    @PatchMapping("/{id}/progress")
    public ResponseEntity<Map<String, Object>> updateProgress(@RequestHeader("Authorization") String auth,
                                                               @PathVariable Long id,
                                                               @RequestBody Map<String, Double> body) {
        String userId = authUtil.getUserIdFromToken(auth);
        Goal goal = goalRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
        if (!goal.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        double newValue = body.getOrDefault("currentValue", goal.getCurrentValue());
        goal.setCurrentValue(newValue);
        goal.setUpdatedAt(LocalDateTime.now());

        Map<String, Object> award = Map.of();
        // Auto-complete if target reached
        if (goal.getTargetValue() != null && newValue >= goal.getTargetValue() && !"completed".equals(goal.getStatus())) {
            goal.setStatus("completed");
            long completed = goalRepo.countByUserIdAndStatus(userId, "completed") + 1;
            award = gamificationService.awardGoalCompleted(userId, completed);
        }

        Goal saved = goalRepo.save(goal);
        return ResponseEntity.ok(Map.of("goal", saved, "award", award));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@RequestHeader("Authorization") String auth,
                                           @PathVariable Long id) {
        String userId = authUtil.getUserIdFromToken(auth);
        Goal existing = goalRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        goalRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

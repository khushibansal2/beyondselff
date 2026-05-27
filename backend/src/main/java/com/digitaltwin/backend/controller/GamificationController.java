package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.UserBadge;
import com.digitaltwin.backend.entity.UserStats;
import com.digitaltwin.backend.service.GamificationService;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gamification")
public class GamificationController {

    private final GamificationService gamificationService;
    private final AuthUtil authUtil;

    public GamificationController(GamificationService gamificationService, AuthUtil authUtil) {
        this.gamificationService = gamificationService;
        this.authUtil = authUtil;
    }

    @GetMapping("/stats")
    public ResponseEntity<UserStats> getStats(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(gamificationService.getStats(userId));
    }

    @GetMapping("/badges")
    public ResponseEntity<List<UserBadge>> getBadges(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(gamificationService.getBadges(userId));
    }

    // Summary: stats + badges in one call (useful for dashboard)
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        UserStats stats = gamificationService.getStats(userId);
        List<UserBadge> badges = gamificationService.getBadges(userId);
        return ResponseEntity.ok(Map.of("stats", stats, "badges", badges));
    }
}

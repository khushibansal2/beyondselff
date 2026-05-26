package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.StudySession;
import com.digitaltwin.backend.repository.StudySessionRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/study")
public class StudySessionController {

    private final StudySessionRepository repo;
    private final AuthUtil authUtil;

    public StudySessionController(StudySessionRepository repo, AuthUtil authUtil) {
        this.repo = repo;
        this.authUtil = authUtil;
    }

    @PostMapping("/sessions")
    public StudySession logSession(@RequestHeader("Authorization") String auth,
                                   @RequestBody Map<String, Object> body) {
        String userId = authUtil.getUserIdFromToken(auth);

        int duration = ((Number) body.getOrDefault("durationMinutes", 30)).intValue();
        String topic = (String) body.getOrDefault("topic", "General");
        String category = (String) body.getOrDefault("category", "");
        int focusQuality = ((Number) body.getOrDefault("focusQuality", 3)).intValue();
        int mentalFatigue = ((Number) body.getOrDefault("mentalFatigue", 3)).intValue();
        String environment = (String) body.getOrDefault("environment", "HOME");

        // XP formula: base XP from duration × focus bonus × fatigue penalty
        double focusMultiplier = 0.5 + (focusQuality / 5.0);
        double fatigueMultiplier = 1.0 - ((mentalFatigue - 1) * 0.05);
        int xp = (int) Math.round((duration / 5.0) * focusMultiplier * fatigueMultiplier);

        StudySession session = StudySession.builder()
                .userId(userId)
                .sessionDate(LocalDate.now())
                .durationMinutes(duration)
                .topic(topic)
                .category(category)
                .focusQuality(Math.max(1, Math.min(5, focusQuality)))
                .mentalFatigue(Math.max(1, Math.min(5, mentalFatigue)))
                .environment(environment)
                .xpEarned(xp)
                .createdAt(LocalDateTime.now())
                .build();

        return repo.save(session);
    }

    @GetMapping("/sessions")
    public List<StudySession> getSessions(@RequestHeader("Authorization") String auth,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        String userId = authUtil.getUserIdFromToken(auth);
        if (from != null && to != null) {
            return repo.findByUserIdAndSessionDateBetweenOrderBySessionDateAsc(userId, from, to);
        }
        return repo.findByUserIdOrderBySessionDateDescCreatedAtDesc(userId);
    }

    @GetMapping("/heatmap")
    public Map<String, Object> getHeatmap(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        LocalDate from = LocalDate.now().minusDays(89);
        LocalDate to = LocalDate.now();
        List<StudySession> sessions = repo.findByUserIdAndSessionDateBetweenOrderBySessionDateAsc(userId, from, to);

        // Group by date: total minutes per day
        Map<String, Integer> minutesByDate = new LinkedHashMap<>();
        for (StudySession s : sessions) {
            String d = s.getSessionDate().toString();
            minutesByDate.merge(d, s.getDurationMinutes(), Integer::sum);
        }

        // Fill all 90 days
        List<Map<String, Object>> heatmap = new ArrayList<>();
        for (int i = 89; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusDays(i);
            String dateStr = d.toString();
            int mins = minutesByDate.getOrDefault(dateStr, 0);
            int level = mins == 0 ? 0 : mins < 30 ? 1 : mins < 60 ? 2 : mins < 120 ? 3 : 4;
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", dateStr);
            entry.put("minutes", mins);
            entry.put("level", level);
            heatmap.add(entry);
        }

        // Total XP
        int totalXP = sessions.stream().mapToInt(StudySession::getXpEarned).sum();

        // Environment stats
        List<Object[]> envStats = repo.findEnvironmentStats(userId);
        List<Map<String, Object>> environmentData = envStats.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            m.put("environment", row[0]);
            m.put("avgFocus", row[1]);
            m.put("count", row[2]);
            return m;
        }).collect(Collectors.toList());

        // Forgetting curve (days since last studied per topic)
        List<Object[]> topicDates = repo.findLastStudiedByTopic(userId);
        List<Map<String, Object>> forgettingCurve = topicDates.stream().map(row -> {
            Map<String, Object> m = new HashMap<>();
            m.put("topic", row[0]);
            LocalDate last = (LocalDate) row[1];
            long daysSince = java.time.temporal.ChronoUnit.DAYS.between(last, LocalDate.now());
            m.put("daysSince", daysSince);
            // retention drops ~20% per day after 1 day (simplified Ebbinghaus)
            double retention = Math.max(0, 100 - (daysSince * 20));
            m.put("retention", Math.round(retention));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("heatmap", heatmap);
        result.put("totalXP", totalXP);
        result.put("environmentData", environmentData);
        result.put("forgettingCurve", forgettingCurve);
        return result;
    }

    @DeleteMapping("/sessions/{id}")
    public Map<String, String> deleteSession(@RequestHeader("Authorization") String auth,
                                              @PathVariable Long id) {
        String userId = authUtil.getUserIdFromToken(auth);
        StudySession session = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (!session.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        repo.delete(session);
        return Map.of("status", "deleted");
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        List<StudySession> all = repo.findByUserIdOrderBySessionDateDescCreatedAtDesc(userId);

        int totalMinutes = all.stream().mapToInt(StudySession::getDurationMinutes).sum();
        int totalXP = all.stream().mapToInt(StudySession::getXpEarned).sum();
        int totalSessions = all.size();

        // Streak: count consecutive days from today backwards
        Set<LocalDate> studyDays = all.stream().map(StudySession::getSessionDate).collect(Collectors.toSet());
        int streak = 0;
        LocalDate check = LocalDate.now();
        while (studyDays.contains(check)) {
            streak++;
            check = check.minusDays(1);
        }

        // Best topic (most minutes)
        Map<String, Integer> topicMinutes = new HashMap<>();
        for (StudySession s : all) {
            topicMinutes.merge(s.getTopic(), s.getDurationMinutes(), Integer::sum);
        }
        String bestTopic = topicMinutes.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey).orElse("—");

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMinutes", totalMinutes);
        stats.put("totalXP", totalXP);
        stats.put("totalSessions", totalSessions);
        stats.put("streak", streak);
        stats.put("bestTopic", bestTopic);
        return stats;
    }
}

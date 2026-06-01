package com.digitaltwin.backend.service;

import com.digitaltwin.backend.entity.UserBadge;
import com.digitaltwin.backend.entity.UserStats;
import com.digitaltwin.backend.repository.UserBadgeRepository;
import com.digitaltwin.backend.repository.UserStatsRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class GamificationService {

    private static final int XP_PER_LOG      = 10;
    private static final int XP_GOAL_CREATED = 15;
    private static final int XP_GOAL_DONE    = 50;
    private static final int XP_STREAK_7     = 25;
    private static final int XP_STREAK_30    = 100;

    private final UserStatsRepository statsRepo;
    private final UserBadgeRepository badgeRepo;

    public GamificationService(UserStatsRepository statsRepo, UserBadgeRepository badgeRepo) {
        this.statsRepo = statsRepo;
        this.badgeRepo = badgeRepo;
    }

    // ─── Called when a manual health/finance/career record is created ─────────

    public Map<String, Object> awardActivity(String userId, String domain) {
        UserStats stats = getOrCreate(userId);
        List<UserBadge> newBadges = new ArrayList<>();
        int xpGained = XP_PER_LOG;

        // Update domain counters
        switch (domain) {
            case "health"  -> stats.setTotalHealthLogs(stats.getTotalHealthLogs() + 1);
            case "finance" -> stats.setTotalFinanceLogs(stats.getTotalFinanceLogs() + 1);
            case "career"  -> stats.setTotalCareerLogs(stats.getTotalCareerLogs() + 1);
        }

        // Update streak
        int streakBonus = updateStreak(stats);
        xpGained += streakBonus;

        // Add XP and recalculate level
        addXp(stats, xpGained);
        statsRepo.save(stats);

        // Check badges
        newBadges.addAll(checkActivityBadges(userId, stats, domain));
        if (streakBonus == XP_STREAK_7)  newBadges.addAll(tryAwardBadge(userId, "week_warrior",    "Week Warrior",    "7-day activity streak",       domain, "🔥"));
        if (streakBonus == XP_STREAK_30) newBadges.addAll(tryAwardBadge(userId, "month_warrior",   "Month Warrior",   "30-day activity streak",      domain, "⚡"));

        return buildResult(xpGained, stats, newBadges);
    }

    // ─── Called when a goal is created ───────────────────────────────────────

    public Map<String, Object> awardGoalCreated(String userId, long totalGoals) {
        UserStats stats = getOrCreate(userId);
        addXp(stats, XP_GOAL_CREATED);
        updateStreak(stats);
        statsRepo.save(stats);

        List<UserBadge> newBadges = new ArrayList<>();
        if (totalGoals == 1) newBadges.addAll(tryAwardBadge(userId, "goal_setter", "Goal Setter", "Created your first goal", "general", "🎯"));

        return buildResult(XP_GOAL_CREATED, stats, newBadges);
    }

    // ─── Called when a goal is completed ─────────────────────────────────────

    public Map<String, Object> awardGoalCompleted(String userId, long totalCompleted) {
        UserStats stats = getOrCreate(userId);
        stats.setTotalGoalsCompleted(stats.getTotalGoalsCompleted() + 1);
        addXp(stats, XP_GOAL_DONE);
        updateStreak(stats);
        statsRepo.save(stats);

        List<UserBadge> newBadges = new ArrayList<>();
        newBadges.addAll(tryAwardBadge(userId, "goal_getter", "Goal Getter", "Completed your first goal", "general", "🏆"));
        if (totalCompleted >= 5)  newBadges.addAll(tryAwardBadge(userId, "goal_crusher",  "Goal Crusher",  "Completed 5 goals",          "general", "💪"));
        if (totalCompleted >= 10) newBadges.addAll(tryAwardBadge(userId, "goal_machine",  "Goal Machine",  "Completed 10 goals",         "general", "🚀"));

        return buildResult(XP_GOAL_DONE, stats, newBadges);
    }

    // ─── Called for manual XP awards (e.g. Grind Room) ─────────────────────

    public Map<String, Object> awardManualXp(String userId, int xpAmount) {
        UserStats stats = getOrCreate(userId);
        updateStreak(stats);
        addXp(stats, xpAmount);
        statsRepo.save(stats);
        return buildResult(xpAmount, stats, List.of());
    }

    // ─── Public getters ───────────────────────────────────────────────────────

    public UserStats getStats(String userId) {
        return getOrCreate(userId);
    }

    public List<UserBadge> getBadges(String userId) {
        return badgeRepo.findByUserIdOrderByEarnedAtDesc(userId);
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    private UserStats getOrCreate(String userId) {
        return statsRepo.findById(userId).orElseGet(() -> UserStats.builder()
                .userId(userId)
                .xp(0).level(1)
                .currentStreak(0).longestStreak(0)
                .totalHealthLogs(0).totalFinanceLogs(0).totalCareerLogs(0).totalGoalsCompleted(0)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build());
    }

    private void addXp(UserStats stats, int amount) {
        stats.setXp(stats.getXp() + amount);
        stats.setLevel((stats.getXp() / 100) + 1);
        stats.setUpdatedAt(LocalDateTime.now());
    }

    // Returns the streak bonus XP earned (0, XP_STREAK_7, or XP_STREAK_30)
    private int updateStreak(UserStats stats) {
        LocalDate today = LocalDate.now();
        LocalDate last  = stats.getLastActivityDate();
        int bonus = 0;

        if (last == null || last.isBefore(today.minusDays(1))) {
            stats.setCurrentStreak(1);
        } else if (last.equals(today.minusDays(1))) {
            stats.setCurrentStreak(stats.getCurrentStreak() + 1);
            if (stats.getCurrentStreak() == 7)  bonus = XP_STREAK_7;
            if (stats.getCurrentStreak() == 30) bonus = XP_STREAK_30;
        }
        // same day — no change to streak

        if (stats.getCurrentStreak() > stats.getLongestStreak()) {
            stats.setLongestStreak(stats.getCurrentStreak());
        }
        stats.setLastActivityDate(today);
        return bonus;
    }

    private List<UserBadge> checkActivityBadges(String userId, UserStats stats, String domain) {
        List<UserBadge> earned = new ArrayList<>();

        int total = stats.getTotalHealthLogs() + stats.getTotalFinanceLogs() + stats.getTotalCareerLogs();
        if (total == 1) earned.addAll(tryAwardBadge(userId, "first_step",      "First Step",       "Logged your first activity",    domain, "👣"));

        switch (domain) {
            case "health" -> {
                if (stats.getTotalHealthLogs() == 10)  earned.addAll(tryAwardBadge(userId, "health_hero",    "Health Hero",    "10 health logs",   "health",  "💚"));
                if (stats.getTotalHealthLogs() == 30)  earned.addAll(tryAwardBadge(userId, "health_master",  "Health Master",  "30 health logs",   "health",  "🏃"));
            }
            case "finance" -> {
                if (stats.getTotalFinanceLogs() == 10) earned.addAll(tryAwardBadge(userId, "money_mind",     "Money Mind",     "10 finance logs",  "finance", "💰"));
                if (stats.getTotalFinanceLogs() == 30) earned.addAll(tryAwardBadge(userId, "finance_master", "Finance Master", "30 finance logs",  "finance", "📈"));
            }
            case "career" -> {
                if (stats.getTotalCareerLogs() == 10)  earned.addAll(tryAwardBadge(userId, "career_champ",   "Career Champ",   "10 career logs",   "career",  "💼"));
                if (stats.getTotalCareerLogs() == 30)  earned.addAll(tryAwardBadge(userId, "career_master",  "Career Master",  "30 career logs",   "career",  "🎓"));
            }
        }

        // All-rounder: logged all 3 domains
        if (stats.getTotalHealthLogs() > 0 && stats.getTotalFinanceLogs() > 0 && stats.getTotalCareerLogs() > 0) {
            earned.addAll(tryAwardBadge(userId, "all_rounder", "All-Rounder", "Logged all 3 domains", "general", "⭐"));
        }

        // Level milestones
        if (stats.getLevel() >= 10) earned.addAll(tryAwardBadge(userId, "centurion", "Centurion", "Reached level 10", "general", "🏅"));

        return earned;
    }

    // Awards the badge only if not already earned
    private List<UserBadge> tryAwardBadge(String userId, String badgeId, String name, String desc, String domain, String icon) {
        if (badgeRepo.existsByUserIdAndBadgeId(userId, badgeId)) return List.of();
        UserBadge badge = UserBadge.builder()
                .userId(userId).badgeId(badgeId).badgeName(name)
                .description(desc).domain(domain).icon(icon)
                .earnedAt(LocalDateTime.now())
                .build();
        badgeRepo.save(badge);
        return List.of(badge);
    }

    private Map<String, Object> buildResult(int xpGained, UserStats stats, List<UserBadge> newBadges) {
        return Map.of(
                "xpGained",    xpGained,
                "totalXp",     stats.getXp(),
                "level",       stats.getLevel(),
                "streak",      stats.getCurrentStreak(),
                "newBadges",   newBadges
        );
    }
}

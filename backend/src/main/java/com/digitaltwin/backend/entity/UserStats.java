package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_stats")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class UserStats {

    @Id
    private String userId;      // 1-to-1 with User

    private int xp;
    private int level;          // derived: floor(xp / 100) + 1

    private int currentStreak;
    private int longestStreak;
    private LocalDate lastActivityDate;

    private int totalHealthLogs;
    private int totalFinanceLogs;
    private int totalCareerLogs;
    private int totalGoalsCompleted;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

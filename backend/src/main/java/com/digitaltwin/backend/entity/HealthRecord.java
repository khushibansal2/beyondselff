package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "health_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class HealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    private LocalDate recordDate;
    private Double sleepHours;
    private Integer stressLevel;    // 1-10
    private Integer moodScore;      // 1-10
    private Integer workoutMinutes;
    private Integer waterGlasses;
    private Integer calories;
    private Double bmi;
    private Integer heartRate;
    private Integer steps;

    private String source;          // csv, google_fit, manual
    private Long importId;

    private LocalDateTime createdAt;
}

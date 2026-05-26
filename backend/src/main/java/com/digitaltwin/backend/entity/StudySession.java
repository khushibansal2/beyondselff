package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "study_sessions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private LocalDate sessionDate;

    @Column(nullable = false)
    private int durationMinutes;

    @Column(nullable = false)
    private String topic;

    @Column
    private String category;

    @Column
    private int focusQuality;   // 1–5

    @Column
    private int mentalFatigue;  // 1–5

    @Column
    private String environment; // HOME | LIBRARY | CAFE | GROUP

    @Column
    private int xpEarned;

    @Column
    private LocalDateTime createdAt;
}

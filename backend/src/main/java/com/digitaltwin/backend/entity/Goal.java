package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "goals")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Goal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    private String domain;      // health, finance, career, cross

    private Double targetValue;
    private Double currentValue;
    private String unit;        // kg, ₹, hours, problems, etc.

    private LocalDate deadline;

    private String status;      // active, completed, failed, paused
    private String priority;    // high, medium, low

    // JSON array of milestone strings e.g. ["25%","50%","75%"]
    @Column(length = 2000)
    private String milestones;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "career_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CareerRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    private LocalDate activityDate;
    private Double studyHours;
    private Double codingHours;
    private Integer dsaProblems;
    private String skillLearned;
    private Integer githubCommits;
    private Integer githubRepos;
    private String[] languages;     // stored as comma-separated

    // Resume extraction
    @Column(length = 2000)
    private String extractedSkills;

    @Column(length = 2000)
    private String extractedProjects;

    private String source;          // csv, github, resume_pdf
    private Long importId;

    private LocalDateTime createdAt;
}

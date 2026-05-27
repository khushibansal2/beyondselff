package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "career_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CareerRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @JsonIgnore
    private User user;

    private LocalDate activityDate;
    private Double studyHours;
    private Double codingHours;
    private Integer dsaProblems;
    private String skillLearned;
    private Integer githubCommits;
    private Integer githubRepos;

    // 1NF fix: multi-valued attributes in their own tables instead of delimited strings
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "career_record_languages",
            joinColumns = @JoinColumn(name = "career_record_id"))
    @Column(name = "language")
    @Builder.Default
    private List<String> languages = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "career_record_skills",
            joinColumns = @JoinColumn(name = "career_record_id"))
    @Column(name = "skill", length = 200)
    @Builder.Default
    private List<String> extractedSkills = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "career_record_projects",
            joinColumns = @JoinColumn(name = "career_record_id"))
    @Column(name = "project_title", length = 500)
    @Builder.Default
    private List<String> extractedProjects = new ArrayList<>();

    private String source;          // csv, github, resume_pdf

    @Column(name = "import_id")
    private Long importId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_id", insertable = false, updatable = false)
    @JsonIgnore
    private ImportHistory importBatch;

    private LocalDateTime createdAt;
}

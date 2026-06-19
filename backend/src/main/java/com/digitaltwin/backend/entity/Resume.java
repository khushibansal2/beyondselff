package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Entity
@Table(name = "resumes")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "import_id")
    private Long importId;

    private String originalFilename;

    /** Candidate name extracted from the resume. */
    private String candidateName;
    private String email;
    private String phone;
    private String location;

    @Column(columnDefinition = "TEXT")
    private String summary;

    /** Full parsed resume stored as JSON for flexible querying. */
    @Column(name = "parsed_json", columnDefinition = "TEXT", nullable = false)
    private String parsedJson;

    /** Comma-separated skill list for quick filtering without JSON parsing. */
    @Column(name = "skills_snapshot", columnDefinition = "TEXT")
    private String skillsSnapshot;

    /** Whether the LLM was used (true) or regex fallback was used (false). */
    private boolean llmParsed;

    private LocalDateTime parsedAt;
}

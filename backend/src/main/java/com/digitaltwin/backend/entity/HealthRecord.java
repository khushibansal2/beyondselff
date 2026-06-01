package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "health_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class HealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false,
                foreignKey = @ForeignKey(name = "fk_health_records_user_id"))
    @JsonIgnore
    private User user;

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

    @Column(name = "import_id")
    private Long importId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_id", insertable = false, updatable = false,
                foreignKey = @ForeignKey(name = "fk_health_records_import_id"))
    @JsonIgnore
    private ImportHistory importBatch;

    private LocalDateTime createdAt;
}

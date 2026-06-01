package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "sustainability_settings")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SustainabilitySettings {

    @Id
    @Column(name = "user_id", length = 36, nullable = false)
    private String userId;

    @Column(name = "sync_enabled", nullable = false)
    private boolean syncEnabled;
}

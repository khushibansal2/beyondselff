package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "twin_states")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TwinState {

    @Id
    private String userId; // 1-to-1 with User

    @Column(columnDefinition = "TEXT", nullable = false)
    private String statePayload; // JSON string of the frontend state

    private Long revision;

    private LocalDateTime lastUpdated;
}

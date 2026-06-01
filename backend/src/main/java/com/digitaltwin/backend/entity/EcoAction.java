package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "eco_actions")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EcoAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "action_name", nullable = false)
    private String actionName;

    @Column(name = "carbon_saved", nullable = false)
    private Double carbonSaved;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;
}

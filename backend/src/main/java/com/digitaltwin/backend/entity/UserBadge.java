package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_badges")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    @Column(nullable = false)
    private String badgeId;     // week_warrior, goal_crusher, etc.

    private String badgeName;
    private String description;
    private String domain;      // health, finance, career, general
    private String icon;        // emoji or icon name

    private LocalDateTime earnedAt;
}

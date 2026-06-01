package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

/**
 * Persists Google Fit / Fitbit OAuth tokens to the database so they survive
 * backend restarts.  One row per app user; upserted on every successful OAuth
 * exchange or token refresh.
 */
@Entity
@Table(name = "fitbit_tokens")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FitbitToken {

    /** App-level user ID — primary key and FK → users.id */
    @Id
    private String userId;

    /** Google OAuth access token (can be long — stored as TEXT) */
    @Column(nullable = false, columnDefinition = "text")
    private String accessToken;

    /** Refresh token used to obtain new access tokens without re-auth */
    @Column(columnDefinition = "text")
    private String refreshToken;

    /** Google's own stable user identifier ('sub' field from userinfo) */
    private String googleUserId;

    /** Last time this row was written */
    private LocalDateTime updatedAt;
}

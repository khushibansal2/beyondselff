package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "plaid_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaidToken {

    @Id
    private String userId;

    @Column(columnDefinition = "text", nullable = false)
    private String accessToken;

    private String itemId;
    private String institutionName;
    private LocalDateTime updatedAt;
}

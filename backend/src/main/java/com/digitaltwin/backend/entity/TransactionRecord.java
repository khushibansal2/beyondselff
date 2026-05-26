package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_records", indexes = {
    @Index(name = "idx_tx_user",     columnList = "user_id"),
    @Index(name = "idx_tx_category", columnList = "category")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TransactionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private double amount;

    @Column
    private String merchant;

    @Column
    private String category;

    @Column
    private String bank;

    @Column
    private String transactionType; // DEBIT | CREDIT

    @Column
    private String paymentMode; // UPI | Credit Card | Debit Card | Net Banking

    @Column(columnDefinition = "TEXT")
    private String rawMessage;

    @Column
    private String source; // manual | live | upload

    @Column(nullable = false)
    private LocalDateTime parsedAt;
}

package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_records", indexes = {
    @Index(name = "idx_tx_user", columnList = "userId"),
    @Index(name = "idx_tx_category", columnList = "category")
})
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TransactionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

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

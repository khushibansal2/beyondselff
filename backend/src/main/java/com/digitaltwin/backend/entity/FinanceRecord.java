package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "finance_records")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FinanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userId;

    private LocalDate transactionDate;
    private BigDecimal amount;
    private String category;        // Food, Transport, Health, Entertainment, etc.
    private String description;
    private String transactionType; // debit / credit
    private String merchant;
    private Boolean isImpulse;      // detected from late-night + non-essential

    private String source;          // csv, pdf_bank_statement, upi
    private Long importId;

    private LocalDateTime createdAt;
}

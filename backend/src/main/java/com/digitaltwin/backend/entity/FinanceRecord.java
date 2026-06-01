package com.digitaltwin.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @Column(name = "user_id", nullable = false)
    private String userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", insertable = false, updatable = false,
                foreignKey = @ForeignKey(name = "fk_finance_records_user_id"))
    @JsonIgnore
    private User user;

    private LocalDate transactionDate;
    private BigDecimal amount;
    private String category;        // Food, Transport, Health, Entertainment, etc.
    private String description;
    private String transactionType; // debit / credit
    private String merchant;
    private Boolean isImpulse;      // detected from late-night + non-essential

    private String source;          // csv, pdf_bank_statement, upi

    @Column(name = "import_id")
    private Long importId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "import_id", insertable = false, updatable = false,
                foreignKey = @ForeignKey(name = "fk_finance_records_import_id"))
    @JsonIgnore
    private ImportHistory importBatch;

    private LocalDateTime createdAt;
}

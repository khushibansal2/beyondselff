package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.TransactionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<TransactionRecord, Long> {
    List<TransactionRecord> findByUserIdOrderByParsedAtDesc(String userId);
    List<TransactionRecord> findByUserIdAndCategoryOrderByParsedAtDesc(String userId, String category);
    List<TransactionRecord> findByUserIdAndParsedAtBetweenOrderByParsedAtDesc(String userId, LocalDateTime from, LocalDateTime to);

    @Query("SELECT t.category, SUM(t.amount), COUNT(t) FROM TransactionRecord t WHERE t.userId = :userId GROUP BY t.category ORDER BY SUM(t.amount) DESC")
    List<Object[]> findCategoryTotals(String userId);

    @Query("SELECT SUM(t.amount) FROM TransactionRecord t WHERE t.userId = :userId AND t.transactionType = 'Debit'")
    Double sumDebitByUser(String userId);
}

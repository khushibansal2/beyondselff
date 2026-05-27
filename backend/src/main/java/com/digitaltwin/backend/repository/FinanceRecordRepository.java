package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.FinanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface FinanceRecordRepository extends JpaRepository<FinanceRecord, Long> {
    List<FinanceRecord> findByImportId(Long importId);
    List<FinanceRecord> findByUserIdOrderByTransactionDateDesc(String userId);
    int countByImportId(Long importId);
    @Transactional
    void deleteByImportId(Long importId);
}

package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.FinanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FinanceRecordRepository extends JpaRepository<FinanceRecord, Long> {
    List<FinanceRecord> findByImportId(Long importId);
}

package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.FinanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface FinanceRecordRepository extends JpaRepository<FinanceRecord, Long> {
    List<FinanceRecord> findByImportId(Long importId);

    @Modifying
    @Query("DELETE FROM FinanceRecord r WHERE r.importId = :importId")
    void deleteByImportId(Long importId);
}

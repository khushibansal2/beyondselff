package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface HealthRecordRepository extends JpaRepository<HealthRecord, Long> {
    List<HealthRecord> findByImportId(Long importId);

    @Modifying
    @Query("DELETE FROM HealthRecord r WHERE r.importId = :importId")
    void deleteByImportId(Long importId);
}

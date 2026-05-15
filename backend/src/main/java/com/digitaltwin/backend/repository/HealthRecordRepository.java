package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HealthRecordRepository extends JpaRepository<HealthRecord, Long> {
    List<HealthRecord> findByImportId(Long importId);
}

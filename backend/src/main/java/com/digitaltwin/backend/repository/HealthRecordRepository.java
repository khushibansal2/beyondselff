package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.HealthRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface HealthRecordRepository extends JpaRepository<HealthRecord, Long> {
    List<HealthRecord> findByImportId(Long importId);
    List<HealthRecord> findByUserIdOrderByRecordDateDesc(String userId);
    int countByImportId(Long importId);
    @Transactional
    void deleteByImportId(Long importId);
}

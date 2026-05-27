package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.CareerRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface CareerRecordRepository extends JpaRepository<CareerRecord, Long> {
    List<CareerRecord> findByImportId(Long importId);
    List<CareerRecord> findByUserIdOrderByActivityDateDesc(String userId);
    int countByImportId(Long importId);
    @Transactional
    void deleteByImportId(Long importId);
}

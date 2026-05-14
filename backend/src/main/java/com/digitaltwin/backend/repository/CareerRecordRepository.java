package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.CareerRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface CareerRecordRepository extends JpaRepository<CareerRecord, Long> {
    List<CareerRecord> findByImportId(Long importId);

    @Modifying
    @Query("DELETE FROM CareerRecord r WHERE r.importId = :importId")
    void deleteByImportId(Long importId);
}

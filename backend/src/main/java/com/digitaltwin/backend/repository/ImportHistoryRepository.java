package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.ImportHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ImportHistoryRepository extends JpaRepository<ImportHistory, Long> {
    List<ImportHistory> findByUserIdOrderByUploadedAtDesc(String userId);
    List<ImportHistory> findByUserIdAndDetectedDomain(String userId, String domain);
}

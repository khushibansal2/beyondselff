package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Goal> findByUserIdAndStatus(String userId, String status);
    List<Goal> findByUserIdAndDomain(String userId, String domain);
    long countByUserIdAndStatus(String userId, String status);
}

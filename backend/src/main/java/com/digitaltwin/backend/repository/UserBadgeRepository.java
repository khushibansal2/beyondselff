package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {
    List<UserBadge> findByUserIdOrderByEarnedAtDesc(String userId);
    boolean existsByUserIdAndBadgeId(String userId, String badgeId);
}

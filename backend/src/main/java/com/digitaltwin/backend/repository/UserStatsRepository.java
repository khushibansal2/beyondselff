package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.UserStats;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserStatsRepository extends JpaRepository<UserStats, String> {
}

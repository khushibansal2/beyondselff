package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.EcoAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface EcoActionRepository extends JpaRepository<EcoAction, Long> {
    List<EcoAction> findByUserIdOrderByLoggedAtDesc(String userId);
}

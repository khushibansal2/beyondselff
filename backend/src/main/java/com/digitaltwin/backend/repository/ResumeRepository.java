package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByUserIdOrderByParsedAtDesc(String userId);
    Optional<Resume> findTopByUserIdOrderByParsedAtDesc(String userId);
}

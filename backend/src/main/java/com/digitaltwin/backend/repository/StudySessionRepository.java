package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface StudySessionRepository extends JpaRepository<StudySession, Long> {
    List<StudySession> findByUserIdOrderBySessionDateDescCreatedAtDesc(String userId);
    List<StudySession> findByUserIdAndSessionDateBetweenOrderBySessionDateAsc(String userId, LocalDate from, LocalDate to);
    List<StudySession> findByUserIdAndSessionDate(String userId, LocalDate date);

    @Query("SELECT s.environment, AVG(s.focusQuality), COUNT(s) FROM StudySession s WHERE s.userId = :userId GROUP BY s.environment")
    List<Object[]> findEnvironmentStats(String userId);

    @Query("SELECT s.topic, MAX(s.sessionDate) FROM StudySession s WHERE s.userId = :userId GROUP BY s.topic ORDER BY MAX(s.sessionDate) DESC")
    List<Object[]> findLastStudiedByTopic(String userId);
}

package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.FitbitToken;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for persisted Google Fit / Fitbit OAuth tokens.
 * All standard CRUD methods (findById, existsById, save, deleteById) are
 * provided automatically by JpaRepository.
 */
public interface FitbitTokenRepository extends JpaRepository<FitbitToken, String> {
}

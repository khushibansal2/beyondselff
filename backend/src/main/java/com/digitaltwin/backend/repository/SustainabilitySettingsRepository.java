package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.SustainabilitySettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SustainabilitySettingsRepository extends JpaRepository<SustainabilitySettings, String> {
}

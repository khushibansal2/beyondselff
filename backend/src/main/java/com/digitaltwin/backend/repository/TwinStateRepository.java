package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.TwinState;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TwinStateRepository extends JpaRepository<TwinState, String> {
}

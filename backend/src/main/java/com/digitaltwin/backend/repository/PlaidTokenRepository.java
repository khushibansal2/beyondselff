package com.digitaltwin.backend.repository;

import com.digitaltwin.backend.entity.PlaidToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlaidTokenRepository extends JpaRepository<PlaidToken, String> {
}

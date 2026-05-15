package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.CareerRecord;
import com.digitaltwin.backend.entity.FinanceRecord;
import com.digitaltwin.backend.entity.HealthRecord;
import com.digitaltwin.backend.repository.CareerRecordRepository;
import com.digitaltwin.backend.repository.FinanceRecordRepository;
import com.digitaltwin.backend.repository.HealthRecordRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final HealthRecordRepository healthRepo;
    private final FinanceRecordRepository financeRepo;
    private final CareerRecordRepository careerRepo;

    public RecordController(HealthRecordRepository healthRepo, FinanceRecordRepository financeRepo, CareerRecordRepository careerRepo) {
        this.healthRepo = healthRepo;
        this.financeRepo = financeRepo;
        this.careerRepo = careerRepo;
    }

    // ── Per-import queries (used by Upload.jsx) ──────────────────────────────

    @GetMapping("/health/import/{importId}")
    public ResponseEntity<List<HealthRecord>> getHealthRecordsByImport(@PathVariable Long importId) {
        return ResponseEntity.ok(healthRepo.findByImportId(importId));
    }

    @GetMapping("/finance/import/{importId}")
    public ResponseEntity<List<FinanceRecord>> getFinanceRecordsByImport(@PathVariable Long importId) {
        return ResponseEntity.ok(financeRepo.findByImportId(importId));
    }

    @GetMapping("/career/import/{importId}")
    public ResponseEntity<List<CareerRecord>> getCareerRecordsByImport(@PathVariable Long importId) {
        return ResponseEntity.ok(careerRepo.findByImportId(importId));
    }

    // ── Per-user queries (used by integrationService.js for provider sync) ───

    @GetMapping("/health")
    public ResponseEntity<List<HealthRecord>> getAllHealthRecords(
            @RequestHeader("Authorization") String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        List<HealthRecord> records = healthRepo.findByUserId(userId);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/finance")
    public ResponseEntity<List<FinanceRecord>> getAllFinanceRecords(
            @RequestHeader("Authorization") String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        List<FinanceRecord> records = financeRepo.findByUserId(userId);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/career")
    public ResponseEntity<List<CareerRecord>> getAllCareerRecords(
            @RequestHeader("Authorization") String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        List<CareerRecord> records = careerRepo.findByUserId(userId);
        return ResponseEntity.ok(records);
    }
}

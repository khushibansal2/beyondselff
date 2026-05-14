package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.CareerRecord;
import com.digitaltwin.backend.entity.FinanceRecord;
import com.digitaltwin.backend.entity.HealthRecord;
import com.digitaltwin.backend.repository.CareerRecordRepository;
import com.digitaltwin.backend.repository.FinanceRecordRepository;
import com.digitaltwin.backend.repository.HealthRecordRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.digitaltwin.backend.util.AuthUtil;
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

    @GetMapping("/health/import/{importId}")
    public ResponseEntity<List<HealthRecord>> getHealthRecordsByImport(@PathVariable Long importId, @RequestHeader("Authorization") String authHeader) {
        AuthUtil.getUserIdFromToken(authHeader);
        return ResponseEntity.ok(healthRepo.findByImportId(importId));
    }

    @GetMapping("/finance/import/{importId}")
    public ResponseEntity<List<FinanceRecord>> getFinanceRecordsByImport(@PathVariable Long importId, @RequestHeader("Authorization") String authHeader) {
        AuthUtil.getUserIdFromToken(authHeader);
        return ResponseEntity.ok(financeRepo.findByImportId(importId));
    }

    @GetMapping("/career/import/{importId}")
    public ResponseEntity<List<CareerRecord>> getCareerRecordsByImport(@PathVariable Long importId, @RequestHeader("Authorization") String authHeader) {
        AuthUtil.getUserIdFromToken(authHeader);
        return ResponseEntity.ok(careerRepo.findByImportId(importId));
    }
}

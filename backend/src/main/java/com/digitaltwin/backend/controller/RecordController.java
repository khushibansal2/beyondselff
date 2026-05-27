package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.CareerRecord;
import com.digitaltwin.backend.entity.FinanceRecord;
import com.digitaltwin.backend.entity.HealthRecord;
import com.digitaltwin.backend.repository.CareerRecordRepository;
import com.digitaltwin.backend.repository.FinanceRecordRepository;
import com.digitaltwin.backend.repository.HealthRecordRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

/**
 * RecordController — health, finance, and career CRUD.
 *
 * Auth is handled entirely by JwtAuthFilter before this controller is reached.
 * AuthUtil.getUserId() reads the userId attribute the filter set on the request.
 * No @RequestHeader("Authorization") parameters needed — they were causing
 * Spring to return 400 when the header was missing, racing with the filter.
 */
@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final HealthRecordRepository  healthRepo;
    private final FinanceRecordRepository financeRepo;
    private final CareerRecordRepository  careerRepo;
    private final AuthUtil authUtil;

    public RecordController(HealthRecordRepository healthRepo,
                            FinanceRecordRepository financeRepo,
                            CareerRecordRepository careerRepo,
                            AuthUtil authUtil) {
        this.healthRepo  = healthRepo;
        this.financeRepo = financeRepo;
        this.careerRepo  = careerRepo;
        this.authUtil    = authUtil;
    }

    // ─── Health ───────────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<List<HealthRecord>> getHealth() {
        return ResponseEntity.ok(healthRepo.findByUserIdOrderByRecordDateDesc(authUtil.getUserId()));
    }

    @GetMapping("/health/import/{importId}")
    public ResponseEntity<List<HealthRecord>> getHealthByImport(@PathVariable Long importId) {
        String userId = authUtil.getUserId();
        List<HealthRecord> records = healthRepo.findByImportId(importId);
        records.removeIf(r -> !userId.equals(r.getUserId())); // ownership check
        return ResponseEntity.ok(records);
    }

    @PostMapping("/health")
    public ResponseEntity<HealthRecord> createHealth(@RequestBody HealthRecord record) {
        String userId = authUtil.getUserId();
        record.setId(null);
        record.setUserId(userId);
        record.setSource("manual");
        record.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(healthRepo.save(record));
    }

    @PutMapping("/health/{id}")
    public ResponseEntity<HealthRecord> updateHealth(@PathVariable Long id,
                                                     @RequestBody HealthRecord updated) {
        String userId = authUtil.getUserId();
        HealthRecord existing = healthRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(healthRepo.save(updated));
    }

    @DeleteMapping("/health/{id}")
    public ResponseEntity<Void> deleteHealth(@PathVariable Long id) {
        String userId = authUtil.getUserId();
        HealthRecord existing = healthRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        healthRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Finance ──────────────────────────────────────────────────────────────

    @GetMapping("/finance")
    public ResponseEntity<List<FinanceRecord>> getFinance() {
        return ResponseEntity.ok(financeRepo.findByUserIdOrderByTransactionDateDesc(authUtil.getUserId()));
    }

    @GetMapping("/finance/import/{importId}")
    public ResponseEntity<List<FinanceRecord>> getFinanceByImport(@PathVariable Long importId) {
        String userId = authUtil.getUserId();
        List<FinanceRecord> records = financeRepo.findByImportId(importId);
        records.removeIf(r -> !userId.equals(r.getUserId()));
        return ResponseEntity.ok(records);
    }

    @PostMapping("/finance")
    public ResponseEntity<FinanceRecord> createFinance(@RequestBody FinanceRecord record) {
        String userId = authUtil.getUserId();
        record.setId(null);
        record.setUserId(userId);
        record.setSource("manual");
        record.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(financeRepo.save(record));
    }

    @PutMapping("/finance/{id}")
    public ResponseEntity<FinanceRecord> updateFinance(@PathVariable Long id,
                                                       @RequestBody FinanceRecord updated) {
        String userId = authUtil.getUserId();
        FinanceRecord existing = financeRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(financeRepo.save(updated));
    }

    @DeleteMapping("/finance/{id}")
    public ResponseEntity<Void> deleteFinance(@PathVariable Long id) {
        String userId = authUtil.getUserId();
        FinanceRecord existing = financeRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        financeRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Career ───────────────────────────────────────────────────────────────

    @GetMapping("/career")
    public ResponseEntity<List<CareerRecord>> getCareer() {
        return ResponseEntity.ok(careerRepo.findByUserIdOrderByActivityDateDesc(authUtil.getUserId()));
    }

    @GetMapping("/career/import/{importId}")
    public ResponseEntity<List<CareerRecord>> getCareerByImport(@PathVariable Long importId) {
        String userId = authUtil.getUserId();
        List<CareerRecord> records = careerRepo.findByImportId(importId);
        records.removeIf(r -> !userId.equals(r.getUserId()));
        return ResponseEntity.ok(records);
    }

    @PostMapping("/career")
    public ResponseEntity<CareerRecord> createCareer(@RequestBody CareerRecord record) {
        String userId = authUtil.getUserId();
        record.setId(null);
        record.setUserId(userId);
        record.setSource("manual");
        record.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(careerRepo.save(record));
    }

    @PutMapping("/career/{id}")
    public ResponseEntity<CareerRecord> updateCareer(@PathVariable Long id,
                                                     @RequestBody CareerRecord updated) {
        String userId = authUtil.getUserId();
        CareerRecord existing = careerRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(careerRepo.save(updated));
    }

    @DeleteMapping("/career/{id}")
    public ResponseEntity<Void> deleteCareer(@PathVariable Long id) {
        String userId = authUtil.getUserId();
        CareerRecord existing = careerRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        careerRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

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

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final HealthRecordRepository healthRepo;
    private final FinanceRecordRepository financeRepo;
    private final CareerRecordRepository careerRepo;
    private final AuthUtil authUtil;

    public RecordController(HealthRecordRepository healthRepo,
                            FinanceRecordRepository financeRepo,
                            CareerRecordRepository careerRepo,
                            AuthUtil authUtil) {
        this.healthRepo = healthRepo;
        this.financeRepo = financeRepo;
        this.careerRepo = careerRepo;
        this.authUtil = authUtil;
    }

    // ─── Health ──────────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<List<HealthRecord>> getHealth(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(healthRepo.findByUserIdOrderByRecordDateDesc(userId));
    }

    @GetMapping("/health/import/{importId}")
    public ResponseEntity<List<HealthRecord>> getHealthByImport(@PathVariable Long importId) {
        return ResponseEntity.ok(healthRepo.findByImportId(importId));
    }

    @PostMapping("/health")
    public ResponseEntity<HealthRecord> createHealth(@RequestHeader("Authorization") String auth,
                                                     @RequestBody HealthRecord record) {
        String userId = authUtil.getUserIdFromToken(auth);
        record.setId(null);
        record.setUserId(userId);
        record.setSource("manual");
        record.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(healthRepo.save(record));
    }

    @PutMapping("/health/{id}")
    public ResponseEntity<HealthRecord> updateHealth(@RequestHeader("Authorization") String auth,
                                                     @PathVariable Long id,
                                                     @RequestBody HealthRecord updated) {
        String userId = authUtil.getUserIdFromToken(auth);
        HealthRecord existing = healthRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(healthRepo.save(updated));
    }

    @DeleteMapping("/health/{id}")
    public ResponseEntity<Void> deleteHealth(@RequestHeader("Authorization") String auth,
                                             @PathVariable Long id) {
        String userId = authUtil.getUserIdFromToken(auth);
        HealthRecord existing = healthRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        healthRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Finance ─────────────────────────────────────────────────────────────

    @GetMapping("/finance")
    public ResponseEntity<List<FinanceRecord>> getFinance(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(financeRepo.findByUserIdOrderByTransactionDateDesc(userId));
    }

    @GetMapping("/finance/import/{importId}")
    public ResponseEntity<List<FinanceRecord>> getFinanceByImport(@PathVariable Long importId) {
        return ResponseEntity.ok(financeRepo.findByImportId(importId));
    }

    @PostMapping("/finance")
    public ResponseEntity<FinanceRecord> createFinance(@RequestHeader("Authorization") String auth,
                                                       @RequestBody FinanceRecord record) {
        String userId = authUtil.getUserIdFromToken(auth);
        record.setId(null);
        record.setUserId(userId);
        record.setSource("manual");
        record.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(financeRepo.save(record));
    }

    @PutMapping("/finance/{id}")
    public ResponseEntity<FinanceRecord> updateFinance(@RequestHeader("Authorization") String auth,
                                                       @PathVariable Long id,
                                                       @RequestBody FinanceRecord updated) {
        String userId = authUtil.getUserIdFromToken(auth);
        FinanceRecord existing = financeRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(financeRepo.save(updated));
    }

    @DeleteMapping("/finance/{id}")
    public ResponseEntity<Void> deleteFinance(@RequestHeader("Authorization") String auth,
                                              @PathVariable Long id) {
        String userId = authUtil.getUserIdFromToken(auth);
        FinanceRecord existing = financeRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        financeRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── Career ──────────────────────────────────────────────────────────────

    @GetMapping("/career")
    public ResponseEntity<List<CareerRecord>> getCareer(@RequestHeader("Authorization") String auth) {
        String userId = authUtil.getUserIdFromToken(auth);
        return ResponseEntity.ok(careerRepo.findByUserIdOrderByActivityDateDesc(userId));
    }

    @GetMapping("/career/import/{importId}")
    public ResponseEntity<List<CareerRecord>> getCareerByImport(@PathVariable Long importId) {
        return ResponseEntity.ok(careerRepo.findByImportId(importId));
    }

    @PostMapping("/career")
    public ResponseEntity<CareerRecord> createCareer(@RequestHeader("Authorization") String auth,
                                                     @RequestBody CareerRecord record) {
        String userId = authUtil.getUserIdFromToken(auth);
        record.setId(null);
        record.setUserId(userId);
        record.setSource("manual");
        record.setCreatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(careerRepo.save(record));
    }

    @PutMapping("/career/{id}")
    public ResponseEntity<CareerRecord> updateCareer(@RequestHeader("Authorization") String auth,
                                                     @PathVariable Long id,
                                                     @RequestBody CareerRecord updated) {
        String userId = authUtil.getUserIdFromToken(auth);
        CareerRecord existing = careerRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        updated.setId(id);
        updated.setUserId(userId);
        updated.setCreatedAt(existing.getCreatedAt());
        return ResponseEntity.ok(careerRepo.save(updated));
    }

    @DeleteMapping("/career/{id}")
    public ResponseEntity<Void> deleteCareer(@RequestHeader("Authorization") String auth,
                                             @PathVariable Long id) {
        String userId = authUtil.getUserIdFromToken(auth);
        CareerRecord existing = careerRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        careerRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

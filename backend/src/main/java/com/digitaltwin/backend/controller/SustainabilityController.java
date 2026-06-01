package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.EcoAction;
import com.digitaltwin.backend.entity.SustainabilitySettings;
import com.digitaltwin.backend.repository.EcoActionRepository;
import com.digitaltwin.backend.repository.SustainabilitySettingsRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sustainability")
public class SustainabilityController {

    private final SustainabilitySettingsRepository settingsRepo;
    private final EcoActionRepository ecoActionRepo;
    private final AuthUtil authUtil;

    public SustainabilityController(SustainabilitySettingsRepository settingsRepo,
                                    EcoActionRepository ecoActionRepo,
                                    AuthUtil authUtil) {
        this.settingsRepo = settingsRepo;
        this.ecoActionRepo = ecoActionRepo;
        this.authUtil = authUtil;
    }

    @GetMapping("/settings")
    public ResponseEntity<SustainabilitySettings> getSettings() {
        String userId = authUtil.getUserId();
        SustainabilitySettings settings = settingsRepo.findById(userId)
                .orElseGet(() -> SustainabilitySettings.builder()
                        .userId(userId)
                        .syncEnabled(false)
                        .build());
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/settings")
    public ResponseEntity<SustainabilitySettings> updateSettings(@RequestBody Map<String, Boolean> body) {
        String userId = authUtil.getUserId();
        boolean enabled = body.getOrDefault("syncEnabled", false);
        SustainabilitySettings settings = SustainabilitySettings.builder()
                .userId(userId)
                .syncEnabled(enabled)
                .build();
        return ResponseEntity.ok(settingsRepo.save(settings));
    }

    @GetMapping("/eco-actions")
    public ResponseEntity<List<EcoAction>> getEcoActions() {
        String userId = authUtil.getUserId();
        return ResponseEntity.ok(ecoActionRepo.findByUserIdOrderByLoggedAtDesc(userId));
    }

    @PostMapping("/eco-actions")
    public ResponseEntity<EcoAction> logEcoAction(@RequestBody Map<String, Object> body) {
        String userId = authUtil.getUserId();
        String actionName = (String) body.get("actionName");
        if (actionName == null || actionName.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "actionName is required");
        }
        
        Number carbonSavedNum = (Number) body.get("carbonSaved");
        if (carbonSavedNum == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "carbonSaved is required");
        }
        double carbonSaved = carbonSavedNum.doubleValue();

        EcoAction action = EcoAction.builder()
                .userId(userId)
                .actionName(actionName)
                .carbonSaved(carbonSaved)
                .loggedAt(LocalDateTime.now())
                .build();
        
        return ResponseEntity.status(HttpStatus.CREATED).body(ecoActionRepo.save(action));
    }

    @DeleteMapping("/eco-actions/{id}")
    public ResponseEntity<Void> deleteEcoAction(@PathVariable Long id) {
        String userId = authUtil.getUserId();
        EcoAction existing = ecoActionRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "EcoAction not found"));
        if (!existing.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        ecoActionRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}

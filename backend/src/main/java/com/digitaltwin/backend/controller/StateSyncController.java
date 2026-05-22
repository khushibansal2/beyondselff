package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.TwinState;
import com.digitaltwin.backend.repository.TwinStateRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/state")
public class StateSyncController {

    private final TwinStateRepository twinStateRepo;

    public StateSyncController(TwinStateRepository twinStateRepo) {
        this.twinStateRepo = twinStateRepo;
    }

    @GetMapping
    public ResponseEntity<?> getState(@RequestHeader("Authorization") String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        Optional<TwinState> optState = twinStateRepo.findById(userId);
        
        if (optState.isEmpty()) {
            // Return 404 so frontend knows to initialize
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No state found"));
        }
        
        return ResponseEntity.ok(optState.get());
    }

    @PostMapping
    public ResponseEntity<?> saveState(@RequestHeader("Authorization") String authHeader,
                                       @RequestBody Map<String, Object> request) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        String statePayload = (String) request.get("statePayload");
        Long revision = ((Number) request.get("revision")).longValue();

        Optional<TwinState> optState = twinStateRepo.findById(userId);
        
        if (optState.isPresent()) {
            TwinState existing = optState.get();
            // Conflict Resolution: if frontend is behind backend
            if (revision < existing.getRevision()) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "message", "Conflict: Backend has a newer revision",
                    "latestState", existing
                ));
            }
        }
        
        TwinState newState = TwinState.builder()
                .userId(userId)
                .statePayload(statePayload)
                .revision(revision + 1)
                .lastUpdated(LocalDateTime.now())
                .build();
                
        twinStateRepo.save(newState);
        
        return ResponseEntity.ok(Map.of(
            "message", "State saved successfully",
            "revision", newState.getRevision()
        ));
    }
}

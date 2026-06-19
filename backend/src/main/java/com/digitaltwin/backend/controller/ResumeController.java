package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.Resume;
import com.digitaltwin.backend.repository.ResumeRepository;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private final ResumeRepository resumeRepo;
    private final AuthUtil authUtil;

    public ResumeController(ResumeRepository resumeRepo, AuthUtil authUtil) {
        this.resumeRepo = resumeRepo;
        this.authUtil = authUtil;
    }

    /** Latest parsed resume for the current user. */
    @GetMapping
    public ResponseEntity<?> getLatest() {
        String userId = authUtil.getUserId();
        Optional<Resume> resume = resumeRepo.findTopByUserIdOrderByParsedAtDesc(userId);
        return resume.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    /** All resume versions for the current user. */
    @GetMapping("/all")
    public ResponseEntity<List<Resume>> getAll() {
        String userId = authUtil.getUserId();
        return ResponseEntity.ok(resumeRepo.findByUserIdOrderByParsedAtDesc(userId));
    }

    /** Specific resume by ID (ownership enforced). */
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        String userId = authUtil.getUserId();
        return resumeRepo.findById(id)
                .filter(r -> r.getUserId().equals(userId))
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

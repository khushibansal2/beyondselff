package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.ImportHistory;
import com.digitaltwin.backend.service.UploadService;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private static final Logger log = LoggerFactory.getLogger(UploadController.class);
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

    private final UploadService uploadService;
    private final AuthUtil authUtil;

    public UploadController(UploadService uploadService, AuthUtil authUtil) {
        this.uploadService = uploadService;
        this.authUtil = authUtil;
    }

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        
        // --- SECURE FILE VALIDATION ---
        if (file.getSize() > MAX_FILE_SIZE) {
            log.warn("[SECURITY AUDIT] Rejected oversized file upload attempt ({} bytes)", file.getSize());
            return ResponseEntity.badRequest().body("File exceeds maximum size of 10MB");
        }
        
        String filename = file.getOriginalFilename();
        if (filename != null && (filename.endsWith(".exe") || filename.endsWith(".sh") || filename.endsWith(".bat"))) {
            log.warn("[SECURITY AUDIT] Rejected dangerous file extension: {}", filename);
            return ResponseEntity.badRequest().body("Dangerous file extensions are not allowed");
        }

        try {
            String userId = authUtil.getUserId();
            log.info("[SECURITY AUDIT] User {} uploading file: {}", userId, filename);
            ImportHistory history = uploadService.processFile(file, userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("[SECURITY AUDIT] File upload failed", e);
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ImportHistory>> getHistory() {
        String userId = authUtil.getUserId();
        return ResponseEntity.ok(uploadService.getUserHistory(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteImport(@PathVariable Long id) {
        String userId = authUtil.getUserId();
        log.info("[SECURITY AUDIT] User {} deleted import ID {}", userId, id);
        return ResponseEntity.ok(uploadService.deleteImport(id));
    }
}

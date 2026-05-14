package com.digitaltwin.backend.controller;

import com.digitaltwin.backend.entity.ImportHistory;
import com.digitaltwin.backend.service.UploadService;
import com.digitaltwin.backend.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private final UploadService uploadService;

    public UploadController(UploadService uploadService) {
        this.uploadService = uploadService;
    }

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        @RequestHeader("Authorization") String authHeader) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        
        // 1. File Size Validation (Max 10MB)
        if (file.getSize() > 10 * 1024 * 1024) {
            return ResponseEntity.status(400).body("File size exceeds 10MB limit.");
        }

        // 2. Mime Type & Extension Validation
        String filename = file.getOriginalFilename();
        String contentType = file.getContentType();
        if (filename == null || contentType == null) {
            return ResponseEntity.badRequest().body("Invalid file metadata.");
        }

        filename = filename.toLowerCase();
        boolean isValidType = false;
        
        // Validate CSV
        if ((filename.endsWith(".csv") && contentType.equals("text/csv")) ||
            // Validate Excel
            (filename.endsWith(".xlsx") && contentType.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) ||
            // Validate PDF
            (filename.endsWith(".pdf") && contentType.equals("application/pdf"))) {
            isValidType = true;
        }

        if (!isValidType) {
            return ResponseEntity.status(415).body("Unsupported file type. Only CSV, XLSX, and PDF are allowed.");
        }
        try {
            String userId = AuthUtil.getUserIdFromToken(authHeader);
            ImportHistory history = uploadService.processFile(file, userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ImportHistory>> getHistory(@RequestHeader("Authorization") String authHeader) {
        String userId = AuthUtil.getUserIdFromToken(authHeader);
        return ResponseEntity.ok(uploadService.getUserHistory(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteImport(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            String userId = AuthUtil.getUserIdFromToken(authHeader);
            // Ideally we'd fetch the import and check userId == import.getUserId()
            // Here we delegate it to service to perform safe deletion.
            uploadService.deleteImportSecurely(id, userId);
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Deletion failed");
        }
    }
}

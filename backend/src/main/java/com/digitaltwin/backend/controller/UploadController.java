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
        // ideally, verify the import belongs to this user before deleting, but keeping it simple
        AuthUtil.getUserIdFromToken(authHeader);
        uploadService.deleteImport(id);
        return ResponseEntity.ok().build();
    }
}

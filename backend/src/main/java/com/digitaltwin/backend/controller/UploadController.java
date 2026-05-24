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
    private final AuthUtil authUtil;

    public UploadController(UploadService uploadService, AuthUtil authUtil) {
        this.uploadService = uploadService;
        this.authUtil = authUtil;
    }

    @PostMapping
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        @RequestHeader("Authorization") String authHeader) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }
        try {
            String userId = authUtil.getUserIdFromToken(authHeader);
            ImportHistory history = uploadService.processFile(file, userId);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @GetMapping("/history")
    public ResponseEntity<List<ImportHistory>> getHistory(@RequestHeader("Authorization") String authHeader) {
        String userId = authUtil.getUserIdFromToken(authHeader);
        return ResponseEntity.ok(uploadService.getUserHistory(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteImport(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        authUtil.getUserIdFromToken(authHeader);
        uploadService.deleteImport(id);
        return ResponseEntity.ok().build();
    }
}
